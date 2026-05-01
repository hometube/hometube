from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)

class Channel(Base):
    __tablename__ = "channels"
    id = Column(Integer, primary_key=True)
    url = Column(String(500), nullable=False)
    name = Column(String(200))

class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True)
    channel_id = Column(Integer, ForeignKey("channels.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    criteria = Column(JSON)
    check_interval = Column(Integer, default=3600)
    last_checked = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())

class Video(Base):
    __tablename__ = "videos"
    id = Column(Integer, primary_key=True)
    video_id = Column(String(20))
    title = Column(String(300))
    channel_id = Column(Integer, ForeignKey("channels.id"))
    url = Column(String(500))
    downloaded = Column(Boolean, default=False)
    added_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())

class Music(Base):
    __tablename__ = "music"
    id = Column(Integer, primary_key=True)
    url = Column(String(500))
    title = Column(String(300))
    artist = Column(String(200))
    is_playlist = Column(Boolean, default=False)
    playlist_id = Column(String(50))
    downloaded = Column(Boolean, default=False)
    added_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())

class Download(Base):
    __tablename__ = "downloads"
    id = Column(Integer, primary_key=True)
    type = Column(String(10))
    item_id = Column(Integer)
    user_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String(20), default="pending")
    progress = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
