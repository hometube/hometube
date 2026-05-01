import subprocess, json, os

DL_DIR = os.environ.get("DL_DIR", "data/downloads")

def run_ytdlp(args):
    cmd = ["yt-dlp", "--no-warnings", "--dump-json"] + args
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.stdout

def get_video_info(url):
    out = run_ytdlp(["--flat-playlist", url])
    try:
        return json.loads(out)
    except:
        return None

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
    out = run_ytdlp([url])
    try:
        return json.loads(out)
    except:
        return None

def download_video(url, video_id):
    os.makedirs(f"{DL_DIR}/videos", exist_ok=True)
    cmd = ["yt-dlp", "-o", f"{DL_DIR}/videos/%(title)s.%(ext)s", url]
    subprocess.run(cmd)
    return True

def download_music(url, music_id):
    os.makedirs(f"{DL_DIR}/music", exist_ok=True)
    cmd = ["yt-dlp", "-x", "--audio-format", "mp3", "-o", f"{DL_DIR}/music/%(title)s.%(ext)s", url]
    subprocess.run(cmd)
    return True
