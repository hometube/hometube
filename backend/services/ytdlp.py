import subprocess, json, os, re

DL_DIR = os.environ.get("DL_DIR", "data/downloads")

def run_ytdlp(args, capture=True):
    cmd = ["yt-dlp", "--no-warnings"] + args
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout if capture else result

def get_video_info(url):
    out = run_ytdlp(["--flat-playlist", "--dump-single-json", url])
    try:
        return json.loads(out)
    except:
        return None

def get_available_formats(url):
    out = run_ytdlp(["-J", url])
    try:
        data = json.loads(out)
        formats = data.get("formats", [])
        seen = set()
        result = []
        for f in formats:
            if f.get("vcodec") == "none":
                continue
            height = f.get("height") or 0
            if height > 0 and height not in seen:
                seen.add(height)
                result.append({
                    "format_id": f.get("format_id"),
                    "height": height,
                    "ext": f.get("ext"),
                    "note": f.get("format_note", "")
                })
        result.sort(key=lambda x: x["height"], reverse=True)
        return result
    except:
        return []

def get_channel_videos(url):
    out = run_ytdlp(["--flat-playlist", url])
    videos = []
    for line in out.strip().split("\n"):
        if line:
            try:
                videos.append(json.loads(line))
            except:
                pass
    return videos

def get_music_info(url):
    out = run_ytdlp(["--dump-single-json", url])
    try:
        return json.loads(out)
    except:
        return None

def download_video(url, video_id, quality="best"):
    os.makedirs(f"{DL_DIR}/videos", exist_ok=True)
    fmt = quality if quality != "best" else "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"
    cmd = ["yt-dlp", "-f", fmt, "-o", f"{DL_DIR}/videos/%(id)s.%(ext)s", url]
    subprocess.run(cmd)
    return True

def download_music(url, music_id):
    os.makedirs(f"{DL_DIR}/music", exist_ok=True)
    cmd = ["yt-dlp", "-x", "--audio-format", "mp3", "-o", f"{DL_DIR}/music/%(id)s.%(ext)s", url]
    subprocess.run(cmd)
    return True
