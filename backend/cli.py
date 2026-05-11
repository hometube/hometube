#!/usr/bin/env python3
"""
HomeTube CLI – export/import .ht files from the terminal.

Export:  python cli.py export [--user-id N] [--output file.ht]
Import:  python cli.py import <file.ht>

The app can be fully populated via imports – no yt-dlp required.
"""

import argparse
import json
import os
import sys
import zipfile
import io
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Ensure the backend package is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import Base, DB_PATH
import models

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)

DL_DIR = os.environ.get("DL_DIR", "data/downloads")


# ---------------------------------------------------------------------------
# Serialization helper (matches main.py)
# ---------------------------------------------------------------------------
def serialize_row(obj):
    d = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if isinstance(val, datetime):
            val = val.isoformat()
        d[col.name] = val
    return d


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------
def cmd_export(args):
    db = SessionLocal()
    try:
        metadata = {"version": 1, "exported_at": datetime.now(timezone.utc).isoformat()}

        q = db.query(models.User)
        if args.user_id:
            q = q.filter(models.User.id == args.user_id)
        metadata["users"] = [serialize_row(u) for u in q.all()]

        q = db.query(models.Channel)
        metadata["channels"] = [serialize_row(c) for c in q.all()]

        q = db.query(models.Subscription)
        if args.user_id:
            q = q.filter(models.Subscription.user_id == args.user_id)
        metadata["subscriptions"] = [serialize_row(s) for s in q.all()]

        q = db.query(models.Video)
        if args.user_id:
            q = q.filter(models.Video.added_by == args.user_id)
        metadata["videos"] = [serialize_row(v) for v in q.all()]

        q = db.query(models.Music)
        if args.user_id:
            q = q.filter(models.Music.added_by == args.user_id)
        metadata["music"] = [serialize_row(m) for m in q.all()]

        q = db.query(models.Playlist)
        if args.user_id:
            q = q.filter(models.Playlist.user_id == args.user_id)
        metadata["playlists"] = [serialize_row(p) for p in q.all()]

        metadata["settings"] = [serialize_row(s) for s in db.query(models.Setting).all()]

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("metadata.json", json.dumps(metadata, default=str, indent=2))

            for v in metadata["videos"]:
                if v.get("downloaded") and v.get("video_id"):
                    fname = f"{v['video_id']}.mp4"
                    fpath = os.path.join(DL_DIR, "videos", fname)
                    if os.path.isfile(fpath):
                        zf.write(fpath, f"videos/{fname}")
                        print(f"  Packed video: {fname}")

            for m in metadata["music"]:
                fname = m.get("filename")
                if fname:
                    fpath = os.path.join(DL_DIR, "music", fname)
                    if os.path.isfile(fpath):
                        zf.write(fpath, f"music/{fname}")
                        print(f"  Packed music: {fname}")

        output = args.output or f"hometube-export-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.ht"
        with open(output, "wb") as f:
            f.write(buf.getvalue())

        counts = {k: len(metadata[k]) for k in ("users", "channels", "subscriptions", "videos", "music", "playlists")}
        print(f"\nExported to {output}")
        print(f"  Users: {counts['users']}, Channels: {counts['channels']}, "
              f"Subscriptions: {counts['subscriptions']}, Videos: {counts['videos']}, "
              f"Music: {counts['music']}, Playlists: {counts['playlists']}")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Import
# ---------------------------------------------------------------------------
def cmd_import(args):
    if not os.path.isfile(args.file):
        print(f"Error: file not found: {args.file}", file=sys.stderr)
        sys.exit(1)
    if not args.file.endswith(".ht"):
        print("Error: file must have .ht extension", file=sys.stderr)
        sys.exit(1)

    db = SessionLocal()
    try:
        with zipfile.ZipFile(args.file, "r") as zf:
            if "metadata.json" not in zf.namelist():
                print("Error: invalid .ht file – missing metadata.json", file=sys.stderr)
                sys.exit(1)

            with zf.open("metadata.json") as f:
                metadata = json.loads(f.read().decode("utf-8"))

            id_map = {}

            # Users
            if "users" in metadata:
                id_map["users"] = {}
                for u in metadata["users"]:
                    existing = db.query(models.User).filter(models.User.username == u["username"]).first()
                    if existing:
                        id_map["users"][u["id"]] = existing.id
                        print(f"  User '{u['username']}' already exists (id {existing.id}), skipped")
                    else:
                        old_id = u["id"]
                        del u["id"]
                        new_u = models.User(**u)
                        db.add(new_u)
                        db.flush()
                        id_map["users"][old_id] = new_u.id
                        print(f"  Imported user: {new_u.username} (id {new_u.id})")

            # Channels
            if "channels" in metadata:
                id_map["channels"] = {}
                for c in metadata["channels"]:
                    old_id = c["id"]
                    del c["id"]
                    new_c = models.Channel(**c)
                    db.add(new_c)
                    db.flush()
                    id_map["channels"][old_id] = new_c.id
                    print(f"  Imported channel: {new_c.name or new_c.url} (id {new_c.id})")

            # Subscriptions
            if "subscriptions" in metadata:
                id_map["subscriptions"] = {}
                for s in metadata["subscriptions"]:
                    old_id = s["id"]
                    del s["id"]
                    if s.get("channel_id") and s["channel_id"] in id_map.get("channels", {}):
                        s["channel_id"] = id_map["channels"][s["channel_id"]]
                    if s.get("user_id") and s["user_id"] in id_map.get("users", {}):
                        s["user_id"] = id_map["users"][s["user_id"]]
                    if s.get("last_checked"):
                        s["last_checked"] = datetime.fromisoformat(s["last_checked"]) if isinstance(s["last_checked"], str) else s["last_checked"]
                    if s.get("created_at"):
                        s["created_at"] = datetime.fromisoformat(s["created_at"]) if isinstance(s["created_at"], str) else s["created_at"]
                    new_s = models.Subscription(**s)
                    db.add(new_s)
                    db.flush()
                    id_map["subscriptions"][old_id] = new_s.id
                    print(f"  Imported subscription (id {new_s.id})")

            # Videos
            if "videos" in metadata:
                id_map["videos"] = {}
                for v in metadata["videos"]:
                    old_id = v["id"]
                    del v["id"]
                    if v.get("channel_id") and v["channel_id"] in id_map.get("channels", {}):
                        v["channel_id"] = id_map["channels"][v["channel_id"]]
                    if v.get("added_by") and v["added_by"] in id_map.get("users", {}):
                        v["added_by"] = id_map["users"][v["added_by"]]
                    if v.get("watched_at"):
                        v["watched_at"] = datetime.fromisoformat(v["watched_at"]) if isinstance(v["watched_at"], str) else v["watched_at"]
                    if v.get("created_at"):
                        v["created_at"] = datetime.fromisoformat(v["created_at"]) if isinstance(v["created_at"], str) else v["created_at"]
                    new_v = models.Video(**v)
                    db.add(new_v)
                    db.flush()
                    id_map["videos"][old_id] = new_v.id
                    print(f"  Imported video: {new_v.title} (id {new_v.id})")

            # Music
            if "music" in metadata:
                id_map["music"] = {}
                for m in metadata["music"]:
                    old_id = m["id"]
                    del m["id"]
                    if m.get("added_by") and m["added_by"] in id_map.get("users", {}):
                        m["added_by"] = id_map["users"][m["added_by"]]
                    if m.get("created_at"):
                        m["created_at"] = datetime.fromisoformat(m["created_at"]) if isinstance(m["created_at"], str) else m["created_at"]
                    new_m = models.Music(**m)
                    db.add(new_m)
                    db.flush()
                    id_map["music"][old_id] = new_m.id
                    print(f"  Imported music: {new_m.title} (id {new_m.id})")

            # Playlists
            if "playlists" in metadata:
                id_map["playlists"] = {}
                for p in metadata["playlists"]:
                    old_id = p["id"]
                    del p["id"]
                    if p.get("user_id") and p["user_id"] in id_map.get("users", {}):
                        p["user_id"] = id_map["users"][p["user_id"]]
                    if p.get("songs"):
                        new_songs = []
                        for song in p["songs"]:
                            s = dict(song)
                            if s.get("music_id") and s["music_id"] in id_map.get("music", {}):
                                s["music_id"] = id_map["music"][s["music_id"]]
                            new_songs.append(s)
                        p["songs"] = new_songs
                    if p.get("created_at"):
                        p["created_at"] = datetime.fromisoformat(p["created_at"]) if isinstance(p["created_at"], str) else p["created_at"]
                    new_p = models.Playlist(**p)
                    db.add(new_p)
                    db.flush()
                    id_map["playlists"][old_id] = new_p.id
                    print(f"  Imported playlist: {new_p.name} (id {new_p.id})")

            # Settings (skip jwt_secret to avoid conflicts)
            if "settings" in metadata:
                for s in metadata["settings"]:
                    if s.get("key") == "jwt_secret":
                        continue
                    existing = db.query(models.Setting).filter(models.Setting.key == s["key"]).first()
                    if not existing:
                        setting_data = {k: v for k, v in s.items() if k in ("key", "value")}
                        db.add(models.Setting(**setting_data))
                        print(f"  Imported setting: {s['key']}")

            # Extract media files
            os.makedirs(os.path.join(DL_DIR, "videos"), exist_ok=True)
            os.makedirs(os.path.join(DL_DIR, "music"), exist_ok=True)

            media_extracted = 0
            for name in zf.namelist():
                if name.startswith("videos/") and not name.endswith("/"):
                    zf.extract(name, DL_DIR)
                    media_extracted += 1
                    print(f"  Extracted video: {name}")
                elif name.startswith("music/") and not name.endswith("/"):
                    zf.extract(name, DL_DIR)
                    media_extracted += 1
                    print(f"  Extracted music: {name}")

            db.commit()

        print(f"\nImport complete!")
        print(f"  Users: {len(metadata.get('users', []))}")
        print(f"  Channels: {len(metadata.get('channels', []))}")
        print(f"  Subscriptions: {len(metadata.get('subscriptions', []))}")
        print(f"  Videos: {len(metadata.get('videos', []))}")
        print(f"  Music: {len(metadata.get('music', []))}")
        print(f"  Playlists: {len(metadata.get('playlists', []))}")
        print(f"  Media files extracted: {media_extracted}")

    except Exception as e:
        db.rollback()
        print(f"Import failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="HomeTube CLI – export/import .ht archive files from the terminal.\n\n"
                    "Export:  python cli.py export [--user-id N] [--output file.ht]\n"
                    "Import:  python cli.py import <file.ht>",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    export_p = sub.add_parser("export", help="Export database to .ht file")
    export_p.add_argument("--user-id", "-u", type=int, help="Limit export to a specific user")
    export_p.add_argument("--output", "-o", help="Output .ht file path")

    import_p = sub.add_parser("import", help="Import .ht file into database")
    import_p.add_argument("file", help="Path to .ht file")

    args = parser.parse_args()

    if args.command == "export":
        cmd_export(args)
    elif args.command == "import":
        cmd_import(args)


if __name__ == "__main__":
    main()
