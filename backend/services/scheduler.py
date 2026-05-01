import asyncio
from datetime import datetime
from database import SessionLocal
from models import Subscription, Video, Channel
from .ytdlp import get_channel_videos

async def check_subscriptions():
    while True:
        db = SessionLocal()
        try:
            subs = db.query(Subscription).all()
            for sub in subs:
                if sub.last_checked and (datetime.utcnow() - sub.last_checked).seconds < sub.check_interval:
                    continue
                channel = db.query(Channel).filter(Channel.id == sub.channel_id).first()
                if not channel:
                    continue
                videos = get_channel_videos(channel.url)
                for v in videos:
                    exists = db.query(Video).filter(Video.video_id == v.get("id")).first()
                    if not exists:
                        criteria = sub.criteria or {}
                        title = v.get("title", "")
                        if criteria.get("keywords"):
                            if not any(k.lower() in title.lower() for k in criteria["keywords"]):
                                continue
                        vid = Video(
                            video_id=v.get("id"),
                            title=title,
                            channel_id=channel.id,
                            url=v.get("url"),
                            added_by=sub.user_id
                        )
                        db.add(vid)
                sub.last_checked = datetime.utcnow()
                db.commit()
        finally:
            db.close()
        await asyncio.sleep(60)
