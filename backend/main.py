from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import asyncio
import re
import os
from contextlib import asynccontextmanager

from database import engine, get_db, Base
import models
from services import ytdlp, scheduler


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
    asyncio.create_task(scheduler.check_subscriptions())
    yield

app = FastAPI(lifespan=lifespan)

# Users
@app.get("/api/users")
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.post("/api/users")
def create_user(data: UserCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == data.username).first()
    if not user:
        user = models.User(username=data.username)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

# Channels
@app.post("/api/channels/add")
def add_channel(data: ChannelAdd, db: Session = Depends(get_db)):
    info = ytdlp.get_video_info(data.url)
    if not info:
        raise HTTPException(400, "Invalid channel URL")
    chan = models.Channel(url=data.url, name=info.get("title", ""))
    db.add(chan)
    db.commit()
    db.refresh(chan)
    return chan

@app.get("/api/channels/{chan_id}/videos")
def get_channel_videos(chan_id: int, db: Session = Depends(get_db)):
    chan = db.query(models.Channel).filter(models.Channel.id == chan_id).first()
    if not chan:
        raise HTTPException(404)
    videos = ytdlp.get_channel_videos(chan.url)
    return videos

@app.post("/api/channels/{chan_id}/subscribe")
def subscribe(chan_id: int, data: SubscribeReq, db: Session = Depends(get_db)):
    sub = models.Subscription(channel_id=chan_id, user_id=data.user_id, criteria=data.criteria, check_interval=data.check_interval)
    db.add(sub)
    db.commit()
    return {"ok": True}

# Videos
@app.post("/api/videos/add")
def add_video(data: VideoAdd, db: Session = Depends(get_db)):
    info = ytdlp.get_video_info(data.url)
    if not info:
        raise HTTPException(400, "Invalid video URL")
    vid = models.Video(video_id=info.get("id"), title=info.get("title"), url=data.url, added_by=data.user_id, quality=data.quality)
    db.add(vid)
    db.commit()
    db.refresh(vid)
    return vid

@app.get("/api/videos")
def list_videos(user_id: int = None, filter: str = "all", db: Session = Depends(get_db)):
    q = db.query(models.Video)
    if user_id:
        q = q.filter(models.Video.added_by == user_id)
    if filter == "unwatched":
        q = q.filter(models.Video.watched_at == None)
    return q.order_by(models.Video.created_at.desc()).all()

@app.post("/api/videos/{vid_id}/watch")
def watch_video(vid_id: int, data: VideoWatch, db: Session = Depends(get_db)):
    vid = db.query(models.Video).filter(models.Video.id == vid_id).first()
    if not vid:
        raise HTTPException(404)
    from datetime import datetime
    vid.watched_at = datetime.utcnow() if data.watched else None
    db.commit()
    return {"ok": True}

@app.post("/api/videos/{vid_id}/keep")
def keep_video(vid_id: int, data: VideoKeep, db: Session = Depends(get_db)):
    vid = db.query(models.Video).filter(models.Video.id == vid_id).first()
    if not vid:
        raise HTTPException(404)
    vid.keep_flag = data.keep
    db.commit()
    return {"ok": True}

@app.post("/api/videos/{vid_id}/download")
def download_video(vid_id: int, data: dict, db: Session = Depends(get_db)):
    vid = db.query(models.Video).filter(models.Video.id == vid_id).first()
    if not vid:
        raise HTTPException(404)
    quality = data.get("quality", vid.quality or "best")
    ytdlp.download_video(vid.url, vid.id, quality)
    vid.downloaded = True
    db.commit()
    return {"ok": True}

@app.get("/api/videos/{vid_id}/qualities")
def get_video_qualities(vid_id: int, db: Session = Depends(get_db)):
    vid = db.query(models.Video).filter(models.Video.id == vid_id).first()
    if not vid:
        raise HTTPException(404)
    return ytdlp.get_available_formats(vid.url)

@app.get("/api/videos/info")
def get_video_info_by_url(url: str):
    return ytdlp.get_available_formats(url)

# Playlists
@app.get("/api/playlists")
def list_playlists(user_id: int = None, db: Session = Depends(get_db)):
    q = db.query(models.Playlist)
    if user_id:
        q = q.filter(models.Playlist.user_id == user_id)
    return q.order_by(models.Playlist.created_at.desc()).all()

@app.post("/api/playlists")
def create_playlist(data: PlaylistCreate, db: Session = Depends(get_db)):
    playlist = models.Playlist(name=data.name, user_id=data.user_id)
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return playlist

@app.post("/api/playlists/{playlist_id}/add")
def add_to_playlist(playlist_id: int, data: PlaylistAddSong, db: Session = Depends(get_db)):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(404)
    songs = playlist.songs or []
    songs.append({"music_id": data.music_id, "position": data.position})
    playlist.songs = songs
    db.commit()
    return {"ok": True}

@app.delete("/api/playlists/{playlist_id}/remove/{music_id}")
def remove_from_playlist(playlist_id: int, music_id: int, db: Session = Depends(get_db)):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(404)
    playlist.songs = [s for s in (playlist.songs or []) if s.get("music_id") != music_id]
    db.commit()
    return {"ok": True}

@app.delete("/api/playlists/{playlist_id}")
def delete_playlist(playlist_id: int, db: Session = Depends(get_db)):
    playlist = db.query(models.Playlist).filter(models.Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(404)
    db.delete(playlist)
    db.commit()
    return {"ok": True}

# Music
@app.get("/api/music/info")
def get_music_info_by_url(url: str):
    return ytdlp.get_music_info(url)

@app.post("/api/music/add")
def add_music(data: MusicAdd, db: Session = Depends(get_db)):
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
def list_music(user_id: int = None, db: Session = Depends(get_db)):
    q = db.query(models.Music)
    if user_id:
        q = q.filter(models.Music.added_by == user_id)
    return q.order_by(models.Music.created_at.desc()).all()

@app.post("/api/music/{music_id}/download")
def download_music(music_id: int, data: MusicDownload, db: Session = Depends(get_db)):
    music = db.query(models.Music).filter(models.Music.id == music_id).first()
    if not music:
        raise HTTPException(404)
    filename = ytdlp.download_music(music.url, music.id)
    music.filename = filename
    music.downloaded = True
    db.commit()
    return {"ok": True, "filename": filename}

@app.get("/api/music/{music_id}/file")
def serve_music_by_id(music_id: int, db: Session = Depends(get_db)):
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
def list_downloads(user_id: int = None, db: Session = Depends(get_db)):
    q = db.query(models.Download)
    if user_id:
        q = q.filter(models.Download.user_id == user_id)
    return q.order_by(models.Download.created_at.desc()).all()

# Serve downloaded files
import os
from fastapi.responses import FileResponse

@app.get("/api/files/videos/{filename:path}")
def serve_video(filename: str):
    path = f"data/downloads/videos/{filename}"
    if not os.path.exists(path):
        raise HTTPException(404)
    return FileResponse(path, media_type="video/mp4", filename=filename)

@app.get("/api/files/music/{filename:path}")
def serve_music(filename: str):
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
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    # SPA fallback - return index.html for client-side routing
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.isfile(index_path):
        return FileResponse(index_path)
    raise HTTPException(404)
