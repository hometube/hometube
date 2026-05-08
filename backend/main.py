from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import re
import os
import secrets
from contextlib import asynccontextmanager
import sys
import jwt
from datetime import datetime, timedelta

from database import engine, get_db, Base
import models
from services import ytdlp, scheduler


# Global variable to store the current ngrok token for display
current_ngrok_token = None
current_ngrok_url = None
jwt_secret = None


def get_jwt_secret(db: Session):
    """Get or create the JWT secret from the database"""
    global jwt_secret
    if jwt_secret:
        return jwt_secret

    setting = db.query(models.Setting).filter(models.Setting.key == "jwt_secret").first()
    if not setting:
        jwt_secret = secrets.token_urlsafe(64)
        setting = models.Setting(key="jwt_secret", value=jwt_secret)
        db.add(setting)
        db.commit()
    else:
        jwt_secret = setting.value
    return jwt_secret


def create_jwt_token(user_id: int, db: Session) -> str:
    """Create a JWT token for a user"""
    secret = get_jwt_secret(db)
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=365),  # Long-lived token
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def verify_jwt_token(token: str, db: Session):
    """Verify a JWT token and return the payload"""
    try:
        secret = get_jwt_secret(db)
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def clean_title(title):
    """Remove video ID from title (e.g., 'Song [video_id]' -> 'Song')"""
    if not title:
        return title
    return re.sub(r'\s*\[[^\]]+\]\s*$', '', title)

class UserCreate(BaseModel):
    username: str

class VideoAdd(BaseModel):
    url: str
    user_id: int
    quality: str = "best"

class ChannelAdd(BaseModel):
    url: str

class SubscribeReq(BaseModel):
    user_id: int
    criteria: dict = {}
    check_interval: int = 3600

class MusicAdd(BaseModel):
    url: str
    user_id: int
    playlist_id: Optional[int] = None

class MusicDownload(BaseModel):
    filename: Optional[str] = None

class PlaylistCreate(BaseModel):
    name: str
    user_id: int

class PlaylistAddSong(BaseModel):
    music_id: int
    position: int = 0

class VideoWatch(BaseModel):
    watched: bool = True

class VideoKeep(BaseModel):
    keep: bool = True

Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize JWT secret and persistent ngrok token
    from sqlalchemy.orm import sessionmaker
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        get_jwt_secret(db)

        # Load or create persistent ngrok token
        global current_ngrok_token
        token_setting = db.query(models.Setting).filter(models.Setting.key == "ngrok_token").first()
        if token_setting:
            current_ngrok_token = token_setting.value
        else:
            current_ngrok_token = secrets.token_urlsafe(32)
            token_setting = models.Setting(key="ngrok_token", value=current_ngrok_token)
            db.add(token_setting)
            db.commit()
    finally:
        db.close()

    # Start background subscription checker
    asyncio.create_task(scheduler.check_subscriptions())

    # If running locally (not in production), set up ngrok tunnel
    # Check if we're likely in a development environment
    if len(sys.argv) > 1 and sys.argv[1] == "--dev":
        try:
            from pyngrok import ngrok, conf

            # Get the port from environment or default to 8000
            port = int(os.environ.get("PORT", 8000))

            # Set auth token if available (optional for basic use)
            # ngrok.set_auth_token(os.environ.get("NGROK_AUTH_TOKEN", ""))

            # Open a ngrok tunnel to the HTTP port
            http_tunnel = ngrok.connect(port, "http")
            global current_ngrok_url
            current_ngrok_url = http_tunnel.public_url

            print("\n" + "="*60)
            print("🚀 HomeTube Development Server Ready!")
            print("="*60)
            print(f"Local API:     http://localhost:{port}")
            print(f"Public URL:    {current_ngrok_url}")
            print(f"For github.io: {current_ngrok_url}/api?token={current_ngrok_token}")
            print("="*60)
            print("Share the 'For github.io' URL with your frontend to enable")
            print("secure access to your local backend via GitHub Pages.")
            print("="*60 + "\n")
        except ImportError:
            print("⚠️  pyngrok not installed. Install with: pip install pyngrok")
            print("   Running in local-only mode.")
        except Exception as e:
            print(f"⚠️  Failed to start ngrok tunnel: {e}")
            print("   Running in local-only mode.")

    yield

    # Clean up ngrok tunnel on shutdown
    if len(sys.argv) > 1 and sys.argv[1] == "--dev":
        try:
            from pyngrok import ngrok
            ngrok.kill()
        except:
            pass

app = FastAPI(lifespan=lifespan)

# CORS middleware - allow all origins since we use Bearer tokens (not cookies)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Force CORS headers on all responses (handles ngrok headers)
@app.middleware("http")
async def force_cors(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, ngrok-skip-browser-warning"
    return response

# Status endpoint - check backend connectivity (uses only ngrok token)
@app.get("/api/status")
def status(request: Request, db: Session = Depends(get_db)):
    global current_ngrok_token

    # Check for ngrok token in query params or Authorization header
    token = request.query_params.get('token', '')
    if not token and request.headers.get('authorization'):
        auth = request.headers.get('authorization')
        if auth.startswith('Bearer '):
            token = auth[7:]

    if current_ngrok_token and token != current_ngrok_token:
        raise HTTPException(status_code=403, detail="Invalid token")

    return {"status": "ok", "version": "1.0"}

# Token exchange endpoint - use temporary ngrok token to get a long-lived JWT
@app.post("/api/auth/exchange")
def exchange_token(data: dict, db: Session = Depends(get_db)):
    global current_ngrok_token

    # Validate the temporary ngrok token
    token = data.get("token", "")
    if not current_ngrok_token or token != current_ngrok_token:
        raise HTTPException(status_code=403, detail="Invalid temporary token")

    # Get or create a system user for the JWT
    user = db.query(models.User).filter(models.User.username == "system").first()
    if not user:
        user = models.User(username="system")
        db.add(user)
        db.commit()
        db.refresh(user)

    # Create and return JWT
    jwt_token = create_jwt_token(user.id, db)
    return {"token": jwt_token, "token_type": "bearer"}

# Dependency to validate JWT token for protected endpoints
async def verify_token(request: Request, db: Session = Depends(get_db)):
    global current_ngrok_token

    # If no ngrok token is set (production mode), allow all
    if not current_ngrok_token:
        return True

    # Get token from query params or Authorization header
    token = None

    # Check query parameters first
    if request.query_params.get('token'):
        token = request.query_params.get('token')
    # Then check Authorization header
    elif request.headers.get('authorization'):
        auth_header = request.headers.get('authorization')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove 'Bearer ' prefix

    if not token:
        raise HTTPException(status_code=401, detail="Missing token")

    # Try JWT validation first
    try:
        payload = verify_jwt_token(token, db)
        return payload
    except HTTPException:
        pass

    # Fall back to ngrok token validation
    if token == current_ngrok_token:
        return True

    raise HTTPException(status_code=403, detail="Invalid or missing token")

# Users
@app.get("/api/users")
def list_users(token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.post("/api/users")
def create_user(data: UserCreate, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == data.username).first()
    if not user:
        user = models.User(username=data.username)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

# Channels
@app.post("/api/channels/add")
def add_channel(data: ChannelAdd, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    info = ytdlp.get_video_info(data.url)
    if not info:
        raise HTTPException(400, "Invalid channel URL")
    chan = models.Channel(url=data.url, name=info.get("title", ""))
    db.add(chan)
    db.commit()
    db.refresh(chan)
    return chan

@app.get("/api/channels/{chan_id}/videos")
def get_channel_videos(chan_id: int, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    chan = db.query(models.Channel).filter(models.Channel.id == chan_id).first()
    if not chan:
        raise HTTPException(404)
    videos = ytdlp.get_channel_videos(chan.url)
    return videos

@app.post("/api/channels/{chan_id}/subscribe")
def subscribe(chan_id: int, data: SubscribeReq, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    sub = models.Subscription(channel_id=chan_id, user_id=data.user_id, criteria=data.criteria, check_interval=data.check_interval)
    db.add(sub)
    db.commit()
    return {"ok": True}

# Videos
@app.post("/api/videos/add")
def add_video(data: VideoAdd, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    info = ytdlp.get_video_info(data.url)
    if not info:
        raise HTTPException(400, "Invalid video URL")
    vid = models.Video(video_id=info.get("id"), title=info.get("title"), url=data.url, added_by=data.user_id, quality=data.quality)
    db.add(vid)
    db.commit()
    db.refresh(vid)
    return vid

@app.get("/api/videos")
def list_videos(user_id: int = None, filter: str = "all", token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    q = db.query(models.Video)
    if user_id:
        q = q.filter(models.Video.added_by == user_id)
    if filter == "unwatched":
        q = q.filter(models.Video.watched_at == None)
    return q.order_by(models.Video.created_at.desc()).all()

@app.post("/api/videos/{vid_id}/watch")
def watch_video(vid_id: int, data: VideoWatch, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    vid = db.query(models.Video).filter(models.Video.id == vid_id).first()
    if not vid:
        raise HTTPException(404)
    from datetime import datetime
    vid.watched_at = datetime.utcnow() if data.watched else None
    db.commit()
    return {"ok": True}

@app.post("/api/videos/{vid_id}/keep")
def keep_video(vid_id: int, data: VideoKeep, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    vid = db.query(models.Video).filter(models.Video.id == vid_id).first()
    if not vid:
        raise HTTPException(404)
    vid.keep_flag = data.keep
    db.commit()
    return {"ok": True}

@app.post("/api/videos/{vid_id}/download")
def download_video(vid_id: int, data: dict, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    vid = db.query(models.Video).filter(models.Video.id == vid_id).first()
    if not vid:
        raise HTTPException(404)
    quality = data.get("quality", vid.quality or "best")
    ytdlp.download_video(vid.url, vid.id, quality)
    vid.downloaded = True
    db.commit()
    return {"ok": True}

@app.get("/api/videos/{vid_id}/qualities")
def get_video_qualities(vid_id: int, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    vid = db.query(models.Video).filter(models.Video.id == vid_id).first()
    if not vid:
        raise HTTPException(404)
    return ytdlp.get_available_formats(vid.url)

@app.get("/api/videos/info")
def get_video_info_by_url(url: str, token_valid: bool = Depends(verify_token)):
    return ytdlp.get_available_formats(url)

# Playlists
@app.get("/api/playlists")
def list_playlists(user_id: int = None, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    q = db.query(models.Playlist)
    if user_id:
        q = q.filter(models.Playlist.user_id == user_id)
    return q.order_by(models.Playlist.created_at.desc()).all()

@app.post("/api/playlists")
def create_playlist(data: PlaylistCreate, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    playlist = models.Playlist(name=data.name, user_id=data.user_id)
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return playlist

@app.post("/api/playlists/{playlist_id}/add")
def add_to_playlist(playlist_id: int, data: PlaylistAddSong, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(404)
    songs = playlist.songs or []
    songs.append({"music_id": data.music_id, "position": data.position})
    playlist.songs = songs
    db.commit()
    return {"ok": True}

@app.delete("/api/playlists/{playlist_id}/remove/{music_id}")
def remove_from_playlist(playlist_id: int, music_id: int, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(404)
    playlist.songs = [s for s in (playlist.songs or []) if s.get("music_id") != music_id]
    db.commit()
    return {"ok": True}

@app.delete("/api/playlists/{playlist_id}")
def delete_playlist(playlist_id: int, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(404)
    db.delete(playlist)
    db.commit()
    return {"ok": True}

# Music
@app.get("/api/music/info")
def get_music_info_by_url(url: str, token_valid: bool = Depends(verify_token)):
    return ytdlp.get_music_info(url)

@app.post("/api/music/add")
def add_music(data: MusicAdd, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    info = ytdlp.get_music_info(data.url)
    if not info:
        raise HTTPException(400, "Invalid music URL")
    title = clean_title(info.get("title"))
    music = models.Music(video_id=info.get("id"), url=data.url, title=title, artist=info.get("artist"), album_art=info.get("thumbnail"), is_playlist="entries" in info, added_by=data.user_id)
    db.add(music)
    db.commit()
    db.refresh(music)
    if data.playlist_id:
        add_to_playlist(data.playlist_id, PlaylistAddSong(music_id=music.id), db)
    return music

@app.get("/api/music")
def list_music(user_id: int = None, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    q = db.query(models.Music)
    if user_id:
        q = q.filter(models.Music.added_by == user_id)
    return q.order_by(models.Music.created_at.desc()).all()

@app.post("/api/music/{music_id}/download")
def download_music(music_id: int, data: MusicDownload, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    music = db.query(models.Music).filter(models.Music.id == music_id).first()
    if not music:
        raise HTTPException(404)
    filename = ytdlp.download_music(music.url, music.id)
    music.filename = filename
    music.downloaded = True
    db.commit()
    return {"ok": True, "filename": filename}

@app.get("/api/music/{music_id}/file")
def serve_music_by_id(music_id: int, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    music = db.query(models.Music).filter(models.Music.id == music_id).first()
    if not music:
        raise HTTPException(404)

    print(f"[DEBUG] Serving music {music_id}: filename={music.filename}, video_id={music.video_id}, url={music.url}, title={music.title}")

    # Use stored filename if available
    if music.filename:
        path = f"data/downloads/music/{music.filename}"
        if os.path.exists(path):
            print(f"[DEBUG] Using stored filename: {path}")
            ext = music.filename.split(".")[-1].lower()
            media_types = {"mp3": "audio/mpeg", "webm": "audio/webm", "m4a": "audio/mp4", "ogg": "audio/ogg", "flac": "audio/flac", "wav": "audio/wav"}
            media_type = media_types.get(ext, "audio/mpeg")
            response = FileResponse(path, media_type=media_type, filename=music.filename)
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            return response
        else:
            print(f"[DEBUG] Stored filename not found on disk: {path}")

    # Try to extract filename from URL (for imported files with file:// prefix)
    if music.url and music.url.startswith('file://'):
        filename = music.url[7:]  # Remove 'file://' prefix
        path = f"data/downloads/music/{filename}"
        if os.path.exists(path):
            print(f"[DEBUG] Using filename from URL: {path}")
            # Save filename to database for future use
            music.filename = filename
            db.commit()
            ext = filename.split(".")[-1].lower()
            media_types = {"mp3": "audio/mpeg", "webm": "audio/webm", "m4a": "audio/mp4", "ogg": "audio/ogg", "flac": "audio/flac", "wav": "audio/wav"}
            media_type = media_types.get(ext, "audio/mpeg")
            response = FileResponse(path, media_type=media_type, filename=filename)
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            return response

    # Find file by video_id or other methods
    import glob
    import re
    video_id = music.video_id
    if not video_id and music.url:
        # Extract from YouTube URL
        match = re.search(r'[?&]v=([^&]+)', music.url)
        if not match:
            match = re.search(r'youtu\.be/([^?&]+)', music.url)
        if match:
            video_id = match.group(1)
    if not video_id and music.title:
        # Extract from title like "Song [video_id]"
        match = re.search(r'\[([^\]]+)\]', music.title)
        if match:
            video_id = match.group(1)
    if not video_id:
        video_id = str(music.id)

    print(f"[DEBUG] Searching for video_id: {video_id}")
    matches = glob.glob(f"data/downloads/music/*{video_id}*")
    print(f"[DEBUG] Glob matches: {matches}")
    if not matches:
        raise HTTPException(404)
    path = matches[0]
    filename = path.split("/")[-1]

    # Save filename to database for future use
    music.filename = filename
    db.commit()

    ext = filename.split(".")[-1].lower()
    media_types = {"mp3": "audio/mpeg", "webm": "audio/webm", "m4a": "audio/mp4", "ogg": "audio/ogg", "flac": "audio/flac", "wav": "audio/wav"}
    media_type = media_types.get(ext, "audio/mpeg")
    response = FileResponse(path, media_type=media_type, filename=filename)
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# Downloads status
@app.get("/api/downloads")
def list_downloads(user_id: int = None, token_valid: bool = Depends(verify_token), db: Session = Depends(get_db)):
    q = db.query(models.Download)
    if user_id:
        q = q.filter(models.Download.user_id == user_id)
    return q.order_by(models.Download.created_at.desc()).all()

# Serve downloaded files
import os
from fastapi.responses import FileResponse

@app.get("/api/files/videos/{filename:path}")
def serve_video(filename: str, token_valid: bool = Depends(verify_token)):
    path = f"data/downloads/videos/{filename}"
    if not os.path.exists(path):
        raise HTTPException(404)
    return FileResponse(path, media_type="video/mp4", filename=filename)

@app.get("/api/files/music/{filename:path}")
def serve_music(filename: str, token_valid: bool = Depends(verify_token)):
    path = f"data/downloads/music/{filename}"
    if not os.path.exists(path):
        raise HTTPException(404)
    ext = filename.split(".")[-1].lower()
    media_types = {"mp3": "audio/mpeg", "webm": "audio/webm", "m4a": "audio/mp4", "ogg": "audio/ogg", "flac": "audio/flac", "wav": "audio/wav"}
    media_type = media_types.get(ext, "audio/mpeg")
    return FileResponse(path, media_type=media_type, filename=filename)

# Serve frontend
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")

@app.get("/{fullpath:path}")
async def serve_spa(fullpath: str):
    # Try to serve static file first
    file_path = os.path.join(frontend_dist, fullpath)
    print(f"[DEBUG] serve_spa: fullpath='{fullpath}', file_path='{file_path}', exists={os.path.isfile(file_path)}")
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    # SPA fallback - return index.html for client-side routing
    index_path = os.path.join(frontend_dist, "index.html")
    print(f"[DEBUG] serve_spa fallback: index_path='{index_path}', exists={os.path.isfile(index_path)}")
    if os.path.isfile(index_path):
        return FileResponse(index_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
    raise HTTPException(404)
