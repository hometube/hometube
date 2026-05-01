from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel
import asyncio

from database import engine, get_db, Base
import models
from services import ytdlp, scheduler

class UserCreate(BaseModel):
    username: str

class VideoAdd(BaseModel):
    url: str
    user_id: int

class ChannelAdd(BaseModel):
    url: str

class SubscribeReq(BaseModel):
    user_id: int
    criteria: dict = {}
    check_interval: int = 3600

class MusicAdd(BaseModel):
    url: str
    user_id: int

Base.metadata.create_all(bind=engine)

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
async def startup():
    asyncio.create_task(scheduler.check_subscriptions())

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
    vid = models.Video(video_id=info.get("id"), title=info.get("title"), url=data.url, added_by=data.user_id)
    db.add(vid)
    db.commit()
    db.refresh(vid)
    return vid

@app.get("/api/videos")
def list_videos(user_id: int = None, db: Session = Depends(get_db)):
    q = db.query(models.Video)
    if user_id:
        q = q.filter(models.Video.added_by == user_id)
    return q.order_by(models.Video.created_at.desc()).all()

@app.post("/api/videos/{vid_id}/download")
def download_video(vid_id: int, data: dict, db: Session = Depends(get_db)):
    vid = db.query(models.Video).filter(models.Video.id == vid_id).first()
    if not vid:
        raise HTTPException(404)
    ytdlp.download_video(vid.url, vid.id)
    vid.downloaded = True
    db.commit()
    return {"ok": True}

# Music
@app.post("/api/music/add")
def add_music(data: MusicAdd, db: Session = Depends(get_db)):
    info = ytdlp.get_music_info(data.url)
    if not info:
        raise HTTPException(400, "Invalid music URL")
    music = models.Music(url=data.url, title=info.get("title"), artist=info.get("artist"), is_playlist="entries" in info, added_by=data.user_id)
    db.add(music)
    db.commit()
    db.refresh(music)
    return music

@app.get("/api/music")
def list_music(user_id: int = None, db: Session = Depends(get_db)):
    q = db.query(models.Music)
    if user_id:
        q = q.filter(models.Music.added_by == user_id)
    return q.order_by(models.Music.created_at.desc()).all()

@app.post("/api/music/{music_id}/download")
def download_music(music_id: int, data: dict, db: Session = Depends(get_db)):
    music = db.query(models.Music).filter(models.Music.id == music_id).first()
    if not music:
        raise HTTPException(404)
    ytdlp.download_music(music.url, music.id)
    music.downloaded = True
    db.commit()
    return {"ok": True}

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
    return FileResponse(path, media_type="audio/mpeg", filename=filename)

# Serve frontend
import os
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
