#!/usr/bin/env python3
"""
HomeTube CLI – manage your HomeTube instance from the terminal.

Usage:
  ht install              Install the ht command to ~/.local/bin
  ht init                 Interactive setup wizard
  ht login <user>         Switch active user (creates if not exists)
  ht download <url>       Download video/music/playlist
  ht export               Export .ht file for active user
  ht import <file.ht>        Import .ht archive
  ht import --music <folder>  Import music files from local folder
  ht songs                List music for active user
  ht playlists            List playlists for active user
  ht videos               List videos for active user
"""

import argparse
import json
import os
import sys
import zipfile
import io
import re
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
CONFIG_DIR = Path.home() / ".config" / "hometube"
CONFIG_FILE = CONFIG_DIR / "config.json"

DL_DIR = None
DB_PATH = None


def load_config():
    if CONFIG_FILE.exists():
        return json.loads(CONFIG_FILE.read_text())
    return {}


def save_config(config):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    CONFIG_FILE.write_text(json.dumps(config, indent=2))


def setup_paths():
    global DL_DIR, DB_PATH
    config = load_config()
    data_dir = config.get("data_dir", "data")
    DL_DIR = os.path.join(data_dir, "downloads")
    DB_PATH = os.path.join(data_dir, "db.sqlite")
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    os.makedirs(f"{DL_DIR}/videos", exist_ok=True)
    os.makedirs(f"{DL_DIR}/music", exist_ok=True)


def get_db():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from database import Base
    import models  # registers tables with Base.metadata

    setup_paths()
    engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    return SessionLocal()


def get_active_user(db):
    config = load_config()
    username = config.get("active_user")
    if username:
        from models import User
        user = db.query(User).filter(User.username == username).first()
        if user:
            return user
    return None


def serialize_row(obj):
    d = {}
    for col in obj.__table__.columns:
        val = getattr(obj, col.name)
        if isinstance(val, datetime):
            val = val.isoformat()
        d[col.name] = val
    return d


def print_table(rows, headers):
    if not rows:
        print("No results.")
        return
    col_widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            col_widths[i] = max(col_widths[i], len(str(cell)))
    header_line = "  ".join(h.ljust(w) for h, w in zip(headers, col_widths))
    print(header_line)
    print("-" * len(header_line))
    for row in rows:
        print("  ".join(str(c).ljust(w) for c, w in zip(row, col_widths)))


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_install(args):
    """Create the ht wrapper script in ~/.local/bin."""
    cli_path = os.path.abspath(__file__)
    bin_dir = Path.home() / ".local" / "bin"
    bin_dir.mkdir(parents=True, exist_ok=True)
    ht_path = bin_dir / "ht"

    # Detect if running inside a virtualenv so the wrapper uses the venv Python
    venv_dir = os.environ.get("VIRTUAL_ENV")
    if venv_dir:
        python_path = os.path.join(venv_dir, "bin", "python3")
    else:
        python_path = "python3"

    ht_path.write_text(f"""#!/bin/sh
exec "{python_path}" "{cli_path}" "$@"
""")
    ht_path.chmod(0o755)
    print(f"Installed ht to {ht_path}")
    if venv_dir:
        print(f"  Uses venv Python: {python_path}")
    print(f"Make sure {bin_dir} is in your PATH:")
    print(f"  export PATH=\"$PATH:{bin_dir}\"")


def cmd_init(args):
    """Interactive setup wizard."""
    config = load_config()

    print("HomeTube Setup\n")

    data_dir = input(f"Data directory [{config.get('data_dir', os.path.join(os.getcwd(), 'data'))}]: ").strip()
    config["data_dir"] = data_dir or config.get("data_dir", os.path.join(os.getcwd(), "data"))

    username = input(f"Default username [{config.get('active_user', '')}]: ").strip()
    if username:
        config["active_user"] = username

    print("\nMode:")
    print("  1) HTTP (local server)")
    print("  2) ngrok (public tunnel)")
    mode_choice = input("Choice [1]: ").strip() or "1"
    config["mode"] = {"1": "http", "2": "ngrok"}.get(mode_choice, "http")

    save_config(config)

    if username:
        db = get_db()
        try:
            from models import User
            user = db.query(User).filter(User.username == username).first()
            if not user:
                user = User(username=username)
                db.add(user)
                db.commit()
                print(f"Created user: {username}")
        finally:
            db.close()

    print("\nSetup complete!")
    print(f"  Data directory: {config['data_dir']}")
    print(f"  Default user: {config.get('active_user', '(none)')}")
    print(f"  Mode: {config['mode']}")


def cmd_login(args):
    """Switch active user, creating if needed."""
    db = get_db()
    try:
        from models import User
        user = db.query(User).filter(User.username == args.username).first()
        if not user:
            create = args.yes
            if not create:
                resp = input(f"User '{args.username}' does not exist. Create? [Y/n]: ").strip().lower()
                create = resp != "n"
            if not create:
                print("Aborted.")
                return
            user = User(username=args.username)
            db.add(user)
            db.commit()
            print(f"Created user: {args.username}")

        config = load_config()
        config["active_user"] = args.username
        save_config(config)
        print(f"Switched to user: {args.username}")
    finally:
        db.close()


def clean_title(title):
    if not title:
        return title
    return re.sub(r'\s*\[[^\]]+\]\s*$', '', title)


def cmd_download(args):
    """Download video/music/playlist from a URL."""
    db = get_db()
    try:
        from models import User, Video, Music, Playlist
        from services import ytdlp

        user = get_active_user(db)
        if not user:
            print("Error: No active user. Use 'ht login <username>' first.", file=sys.stderr)
            sys.exit(1)

        print(f"Fetching info for: {args.url}")
        info = ytdlp.get_music_info(args.url)
        if not info:
            print("Error: Could not fetch URL info", file=sys.stderr)
            sys.exit(1)

        is_playlist = "entries" in info and info["entries"]

        if is_playlist:
            entries = [e for e in info["entries"] if e and e.get("id")]
            if not entries:
                print("Error: Empty playlist", file=sys.stderr)
                sys.exit(1)

            content_type = args.type or ("music" if entries[0].get("artist") or entries[0].get("album") or entries[0].get("track") else "video")

            if content_type == "video":
                print(f"Adding {len(entries)} videos...")
                for entry in entries:
                    entry_url = entry.get("webpage_url") or entry.get("url") or f"https://www.youtube.com/watch?v={entry.get('id')}"
                    existing = db.query(Video).filter(Video.video_id == entry["id"]).first()
                    if existing:
                        print(f"  Exists: {entry.get('title', entry['id'])}")
                        continue
                    vid = Video(video_id=entry["id"], title=entry.get("title"), url=entry_url, added_by=user.id, quality=args.quality)
                    db.add(vid)
                    db.flush()
                    print(f"  Added: {entry.get('title', entry['id'])}")
                    if args.download:
                        ytdlp.download_video(entry_url, vid.id, args.quality)
                        vid.downloaded = True
                        print(f"  Downloaded: {entry.get('title', entry['id'])}")
                db.commit()
                print(f"\nAdded {len(entries)} videos.")
            else:
                playlist_name = args.playlist or info.get("title", "").strip() or "New Playlist"
                playlist = None
                if args.playlist:
                    playlist = db.query(Playlist).filter(Playlist.name == args.playlist, Playlist.user_id == user.id).first()
                if not playlist:
                    playlist = Playlist(name=playlist_name, user_id=user.id)
                    db.add(playlist)
                    db.flush()
                    print(f"Created playlist: {playlist.name}")
                else:
                    print(f"Adding to playlist: {playlist.name}")

                print(f"Downloading {len(entries)} tracks...")
                for entry in entries:
                    if not entry.get("id"):
                        continue
                    title = clean_title(entry.get("title", "Unknown"))
                    artist = entry.get("artist") or entry.get("channel") or entry.get("uploader")
                    album_art = entry.get("thumbnail") or info.get("thumbnail")
                    entry_url = entry.get("webpage_url") or entry.get("url") or f"https://www.youtube.com/watch?v={entry.get('id')}"
                    existing = db.query(Music).filter(Music.video_id == entry["id"]).first()
                    if existing:
                        print(f"  Exists: {title}")
                        continue
                    music = Music(video_id=entry["id"], url=entry_url, title=title, artist=artist, album_art=album_art, added_by=user.id)
                    db.add(music)
                    db.flush()
                    filename = ytdlp.download_music(entry_url, music.id)
                    music.filename = filename
                    music.downloaded = True
                    db.flush()
                    songs = playlist.songs or []
                    songs.append({"music_id": music.id, "position": len(songs)})
                    playlist.songs = songs
                    print(f"  Downloaded: {title}")
                db.commit()
                print(f"\nDownloaded {len(entries)} tracks to '{playlist.name}'.")
        else:
            content_type = args.type or ("music" if info.get("artist") or info.get("album") or info.get("track") else "video")

            if content_type == "video":
                existing = db.query(Video).filter(Video.video_id == info.get("id")).first()
                if existing:
                    print(f"Video already exists: {existing.title}")
                else:
                    vid = Video(video_id=info.get("id"), title=info.get("title"), url=info.get("webpage_url") or args.url, added_by=user.id, quality=args.quality)
                    db.add(vid)
                    db.flush()
                    if args.download:
                        ytdlp.download_video(args.url, vid.id, args.quality)
                        vid.downloaded = True
                    db.commit()
                    print(f"Added video: {vid.title}")
            else:
                title = clean_title(info.get("title"))
                artist = info.get("artist") or info.get("channel") or info.get("uploader")
                existing = db.query(Music).filter(Music.video_id == info.get("id")).first()
                if existing:
                    print(f"Music already exists: {title}")
                else:
                    music = Music(video_id=info.get("id"), url=info.get("webpage_url") or args.url, title=title, artist=artist, album_art=info.get("thumbnail"), added_by=user.id)
                    db.add(music)
                    db.flush()
                    filename = ytdlp.download_music(args.url, music.id)
                    music.filename = filename
                    music.downloaded = True
                    db.commit()
                    print(f"Downloaded: {title}")

                    if args.playlist:
                        playlist = db.query(Playlist).filter(Playlist.name == args.playlist, Playlist.user_id == user.id).first()
                        if not playlist:
                            playlist = Playlist(name=args.playlist, user_id=user.id)
                            db.add(playlist)
                            db.flush()
                        songs = playlist.songs or []
                        songs.append({"music_id": music.id, "position": len(songs)})
                        playlist.songs = songs
                        db.commit()
                        print(f"Added to playlist: {playlist.name}")
    finally:
        db.close()


def cmd_export(args):
    """Export .ht file for the active user."""
    db = get_db()
    try:
        from models import User, Video, Music, Playlist, Channel, Subscription, Setting

        user = get_active_user(db)
        if not user:
            print("Error: No active user. Use 'ht login <username>' first.", file=sys.stderr)
            sys.exit(1)

        setup_paths()

        date_from = None
        now = datetime.utcnow()
        if args.day:
            date_from = now - timedelta(days=1)
        elif args.week:
            date_from = now - timedelta(days=7)
        elif args.month:
            date_from = now - timedelta(days=30)

        metadata = {"version": 1, "exported_at": now.isoformat()}

        metadata["users"] = [serialize_row(u) for u in db.query(User).filter(User.id == user.id).all()]

        metadata["channels"] = [serialize_row(c) for c in db.query(Channel).all()]

        metadata["subscriptions"] = [serialize_row(s) for s in db.query(Subscription).filter(Subscription.user_id == user.id).all()]

        q = db.query(Video).filter(Video.added_by == user.id)
        if date_from:
            q = q.filter(Video.created_at >= date_from)
        metadata["videos"] = [serialize_row(v) for v in q.all()]

        q = db.query(Music).filter(Music.added_by == user.id)
        if date_from:
            q = q.filter(Music.created_at >= date_from)
        metadata["music"] = [serialize_row(m) for m in q.all()]

        metadata["playlists"] = [serialize_row(p) for p in db.query(Playlist).filter(Playlist.user_id == user.id).all()]

        metadata["settings"] = [serialize_row(s) for s in db.query(Setting).all()]

        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("metadata.json", json.dumps(metadata, default=str, indent=2))
            for v in metadata["videos"]:
                if v.get("downloaded") and v.get("video_id"):
                    fname = f"{v['video_id']}.mp4"
                    fpath = os.path.join(DL_DIR, "videos", fname)
                    if os.path.isfile(fpath):
                        zf.write(fpath, f"videos/{fname}")
            for m in metadata["music"]:
                fname = m.get("filename")
                if fname:
                    fpath = os.path.join(DL_DIR, "music", fname)
                    if os.path.isfile(fpath):
                        zf.write(fpath, f"music/{fname}")

        output = args.output or f"hometube-export-{now.strftime('%Y%m%d-%H%M%S')}.ht"
        with open(output, "wb") as f:
            f.write(buf.getvalue())

        counts = {k: len(metadata[k]) for k in ("users", "channels", "subscriptions", "videos", "music", "playlists")}
        print(f"Exported to {output}")
        print(f"  Users: {counts['users']}, Channels: {counts['channels']}, "
              f"Subscriptions: {counts['subscriptions']}, Videos: {counts['videos']}, "
              f"Music: {counts['music']}, Playlists: {counts['playlists']}")
    finally:
        db.close()


def cmd_import_music(args):
    """Import music files from a local folder."""
    folder = args.file or args.music
    if not folder or not os.path.isdir(folder):
        print(f"Error: folder not found: {folder}", file=sys.stderr)
        sys.exit(1)

    db = get_db()
    try:
        from models import User, Music, Playlist

        user = get_active_user(db)
        if not user:
            print("Error: No active user. Use 'ht login <username>' first.", file=sys.stderr)
            sys.exit(1)

        from import_music import extract_metadata

        # Resolve playlist by name
        playlist = None
        if args.playlist:
            playlist = db.query(Playlist).filter(Playlist.name == args.playlist, Playlist.user_id == user.id).first()
            if not playlist:
                playlist = Playlist(name=args.playlist, user_id=user.id)
                db.add(playlist)
                db.flush()
                print(f"Created playlist: {playlist.name}")

        setup_paths()

        SUPPORTED = {'.mp3', '.webm', '.flac', '.wav', '.m4a', '.ogg', '.aac'}
        existing_files = set(os.listdir(os.path.join(DL_DIR, "music")))
        imported = 0

        for root, _dirs, files in os.walk(folder):
            for fname in files:
                ext = Path(fname).suffix.lower()
                if ext not in SUPPORTED:
                    continue
                fpath = os.path.join(root, fname)

                meta = extract_metadata(fpath)

                dest = f"{meta['artist']} - {meta['title']}{ext}".replace("/", "-").replace("\\", "-")
                counter = 0
                orig = dest
                while dest in existing_files:
                    counter += 1
                    dest = f"{Path(orig).stem} ({counter}){ext}"
                existing_files.add(dest)

                dest_path = os.path.join(DL_DIR, "music", dest)
                if args.move:
                    shutil.move(fpath, dest_path)
                else:
                    shutil.copy2(fpath, dest_path)

                music = Music(
                    url=f"file://{dest}",
                    title=meta["title"],
                    artist=meta["artist"],
                    video_id=meta.get("video_id"),
                    filename=dest,
                    downloaded=True,
                    added_by=user.id,
                )
                db.add(music)
                db.flush()

                if playlist:
                    songs = playlist.songs or []
                    songs.append({"music_id": music.id, "position": len(songs)})
                    playlist.songs = songs

                imported += 1
                print(f"  Imported: {meta['title']} by {meta['artist']}")

        db.commit()
        print(f"\nImported {imported} song(s).")
        if playlist:
            print(f"  Added to playlist: {playlist.name}")
    finally:
        db.close()


def cmd_import(args):
    """Import .ht archive."""
    if not args.file or not os.path.isfile(args.file):
        print(f"Error: file not found: {args.file}", file=sys.stderr)
        sys.exit(1)
    if not args.file.endswith(".ht"):
        print("Error: file must have .ht extension", file=sys.stderr)
        sys.exit(1)

    db = get_db()
    try:
        from models import User, Video, Music, Playlist, Channel, Subscription, Setting

        setup_paths()

        with zipfile.ZipFile(args.file, "r") as zf:
            if "metadata.json" not in zf.namelist():
                print("Error: invalid .ht file -- missing metadata.json", file=sys.stderr)
                sys.exit(1)

            with zf.open("metadata.json") as f:
                metadata = json.loads(f.read().decode("utf-8"))

            id_map = {}

            if "users" in metadata:
                id_map["users"] = {}
                for u in metadata["users"]:
                    existing = db.query(User).filter(User.username == u["username"]).first()
                    if existing:
                        id_map["users"][u["id"]] = existing.id
                        print(f"  User '{u['username']}' already exists (id {existing.id}), skipped")
                    else:
                        old_id = u["id"]
                        del u["id"]
                        new_u = User(**u)
                        db.add(new_u)
                        db.flush()
                        id_map["users"][old_id] = new_u.id
                        print(f"  Imported user: {new_u.username} (id {new_u.id})")

            if "channels" in metadata:
                id_map["channels"] = {}
                for c in metadata["channels"]:
                    old_id = c["id"]
                    del c["id"]
                    new_c = Channel(**c)
                    db.add(new_c)
                    db.flush()
                    id_map["channels"][old_id] = new_c.id
                    print(f"  Imported channel: {new_c.name or new_c.url} (id {new_c.id})")

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
                    new_s = Subscription(**s)
                    db.add(new_s)
                    db.flush()
                    id_map["subscriptions"][old_id] = new_s.id
                    print(f"  Imported subscription (id {new_s.id})")

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
                    new_v = Video(**v)
                    db.add(new_v)
                    db.flush()
                    id_map["videos"][old_id] = new_v.id
                    print(f"  Imported video: {new_v.title} (id {new_v.id})")

            if "music" in metadata:
                id_map["music"] = {}
                for m in metadata["music"]:
                    old_id = m["id"]
                    del m["id"]
                    if m.get("added_by") and m["added_by"] in id_map.get("users", {}):
                        m["added_by"] = id_map["users"][m["added_by"]]
                    if m.get("created_at"):
                        m["created_at"] = datetime.fromisoformat(m["created_at"]) if isinstance(m["created_at"], str) else m["created_at"]
                    new_m = Music(**m)
                    db.add(new_m)
                    db.flush()
                    id_map["music"][old_id] = new_m.id
                    print(f"  Imported music: {new_m.title} (id {new_m.id})")

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
                    new_p = Playlist(**p)
                    db.add(new_p)
                    db.flush()
                    id_map["playlists"][old_id] = new_p.id
                    print(f"  Imported playlist: {new_p.name} (id {new_p.id})")

            if "settings" in metadata:
                for s in metadata["settings"]:
                    if s.get("key") == "jwt_secret":
                        continue
                    existing = db.query(Setting).filter(Setting.key == s["key"]).first()
                    if not existing:
                        setting_data = {k: v for k, v in s.items() if k in ("key", "value")}
                        db.add(Setting(**setting_data))
                        print(f"  Imported setting: {s['key']}")

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


def cmd_songs(args):
    """List music for active user."""
    db = get_db()
    try:
        from models import Music

        user = get_active_user(db)
        if not user:
            print("Error: No active user. Use 'ht login <username>' first.", file=sys.stderr)
            sys.exit(1)

        songs = db.query(Music).filter(Music.added_by == user.id).order_by(Music.created_at.desc()).all()
        if not songs:
            print("No songs found.")
            return

        rows = [(s.id, (s.title or "")[:50], s.artist or "", "y" if s.downloaded else "n", s.created_at.strftime("%Y-%m-%d") if s.created_at else "") for s in songs]
        print_table(rows, ["ID", "Title", "Artist", "DL", "Date"])
    finally:
        db.close()


def cmd_playlists(args):
    """List playlists for active user."""
    db = get_db()
    try:
        from models import Playlist

        user = get_active_user(db)
        if not user:
            print("Error: No active user. Use 'ht login <username>' first.", file=sys.stderr)
            sys.exit(1)

        playlists = db.query(Playlist).filter(Playlist.user_id == user.id).order_by(Playlist.created_at.desc()).all()
        if not playlists:
            print("No playlists found.")
            return

        rows = [(p.id, p.name, len(p.songs) if p.songs else 0, p.created_at.strftime("%Y-%m-%d") if p.created_at else "") for p in playlists]
        print_table(rows, ["ID", "Name", "Songs", "Created"])
    finally:
        db.close()


def cmd_videos(args):
    """List videos for active user."""
    db = get_db()
    try:
        from models import Video

        user = get_active_user(db)
        if not user:
            print("Error: No active user. Use 'ht login <username>' first.", file=sys.stderr)
            sys.exit(1)

        videos = db.query(Video).filter(Video.added_by == user.id).order_by(Video.created_at.desc()).all()
        if not videos:
            print("No videos found.")
            return

        rows = []
        for v in videos:
            rows.append((v.id, (v.title or "")[:55], "y" if v.watched_at else "n", "y" if v.downloaded else "n", "y" if v.keep_flag else "", v.created_at.strftime("%Y-%m-%d") if v.created_at else ""))
        print_table(rows, ["ID", "Title", "Watched", "DL", "Keep", "Date"])
    finally:
        db.close()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="HomeTube CLI -- manage your HomeTube instance from the terminal.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("install", help="Install the ht command to ~/.local/bin")

    sub.add_parser("init", help="Interactive setup wizard")

    login_p = sub.add_parser("login", help="Switch active user (creates if not exists)")
    login_p.add_argument("username", help="Username")
    login_p.add_argument("--yes", "-y", action="store_true", help="Create user without prompting")

    dl_p = sub.add_parser("download", help="Download video/music/playlist from URL")
    dl_p.add_argument("url", help="URL to download")
    dl_p.add_argument("--type", choices=["video", "music"], help="Force content type (auto-detected by default)")
    dl_p.add_argument("--playlist", "-p", help="Playlist name to add music to")
    dl_p.add_argument("--quality", "-q", default="best", help="Video quality")
    dl_p.add_argument("--download", "-d", action="store_true", default=True, help="Download media (default: on)")
    dl_p.add_argument("--no-download", action="store_true", help="Add to DB only, skip download")

    export_p = sub.add_parser("export", help="Export .ht file for active user")
    export_p.add_argument("--output", "-o", help="Output .ht file path")
    export_p.add_argument("--day", action="store_true", help="Last 24 hours only")
    export_p.add_argument("--week", action="store_true", help="Last 7 days only")
    export_p.add_argument("--month", action="store_true", help="Last 30 days only")

    import_p = sub.add_parser("import", help="Import .ht archive or music files from a folder")
    import_p.add_argument("file", nargs="?", help="Path to .ht file or music folder (with --music)")
    import_p.add_argument("--music", "-m", help="Import music files from a folder")
    import_p.add_argument("--playlist", "-p", help="Playlist name to add imported music to")
    import_p.add_argument("--move", action="store_true", help="Move files instead of copying (music import)")

    sub.add_parser("songs", help="List music for active user")

    sub.add_parser("playlists", help="List playlists for active user")

    sub.add_parser("videos", help="List videos for active user")

    args = parser.parse_args()

    # Handle --no-download override
    if hasattr(args, "no_download") and args.no_download:
        args.download = False

    # Route import: --music flag triggers music folder import; otherwise .ht archive
    if args.command == "import" and args.music:
        cmd_import_music(args)
        return

    cmds = {
        "install": cmd_install,
        "init": cmd_init,
        "login": cmd_login,
        "download": cmd_download,
        "export": cmd_export,
        "import": cmd_import,
        "songs": cmd_songs,
        "playlists": cmd_playlists,
        "videos": cmd_videos,
    }

    cmds[args.command](args)


if __name__ == "__main__":
    main()
