# HomeTube

A self-hosted YouTube media downloader with a mobile-friendly web interface. Download videos and music from YouTube for offline viewing/listening, subscribe to channels, and automatically detect new uploads.

## Features

- **Video Downloads** - Paste YouTube URLs to download MP4 files with selectable quality (1080p/720p/480p/best)
- **Music Downloads** - Extract audio from videos/playlists as MP3 files, organize into playlists
- **Channel Subscriptions** - Subscribe to channels and auto-detect new videos with keyword/length/quality filters
- **Video Player** - In-app player with speed control (0.5x-2x), audio mode (screen-off listening), fullscreen
- **Smart Feed** - Video feed sorted by recency, filter by "My Feed" / "All Videos" / "Unwatched"
- **Watch Tracking** - Videos auto-marked as watched, with "Keep" flag to prevent auto-delete
- **Auto-Cleanup** - Watched videos automatically deleted after 7 days (unless kept)
- **Playlist Management** - Create playlists, add songs, shuffle/repeat playback
- **Multi-User Support** - Multiple users with separate collections
- **Progressive Web App** - Mobile-optimized, installable on phones, download files to device
- **Automatic Scheduling** - Background service checks subscriptions every 60 seconds

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, SQLite
- **Frontend**: Vue 3, Vite, Tailwind CSS, Plyr.js
- **Icons**: Font Awesome
- **Downloads**: yt-dlp

## Setup

### Prerequisites

- Python 3 with pip
- Node.js with npm

### Quick Start (Production)

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Build frontend
cd ../frontend
npm install
npm run build

# Start the app (serves frontend from backend)
cd ../backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000` in your browser.

### Development Mode

Run both servers in separate terminals:

```bash
# Terminal 1: Backend (with auto-reload)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# Runs on http://localhost:8000

# Terminal 2: Frontend (with hot reload)
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Environment Variables

- `DB_PATH` - SQLite database path (default: `data/db.sqlite`)
- `DL_DIR` - Download directory (default: `data/downloads`)

## Usage

1. Open the web interface and create/select a user
2. **Video Home**: View your feed, filter videos, tap to play with built-in player
3. **Add Video**: Paste YouTube URL, select quality, download to server and device
4. **Add Channel**: Browse channel videos or subscribe with auto-download rules
5. **Music Home**: View playlists ("My Songs" / "All Songs"), create new playlists
6. **Add Music**: Paste song/playlist URL, add to playlist, download to device
7. **Playlist View**: Full player with album art, shuffle/repeat, song queue management

## Project Structure

```
hometube/
├── backend/
│   ├── main.py              # FastAPI app with REST endpoints
│   ├── models.py            # DB models (User, Video, Music, Channel, Subscription, Playlist)
│   ├── database.py          # SQLite configuration
│   ├── requirements.txt     # Python dependencies
│   └── services/
│       ├── ytdlp.py         # yt-dlp wrapper for downloads
│       └── scheduler.py     # Background subscription checker + auto-delete
├── frontend/
│   ├── src/
│   │   ├── App.vue         # Main Vue app with nav menu
│   │   ├── api.js          # API client
│   │   ├── pages/
│   │   │   ├── UserPage.vue
│   │   │   ├── VideoHome.vue    # Video feed + player
│   │   │   ├── AddVideo.vue     # Add video by URL
│   │   │   ├── AddChannel.vue   # Channel browser + subscribe
│   │   │   ├── MusicHome.vue    # Playlists + songs
│   │   │   ├── AddMusic.vue     # Add music by URL
│   │   │   └── PlaylistView.vue # Music player with queue
│   │   └── style.css
│   ├── package.json
│   └── vite.config.js      # Vite + PWA config
└── data/
    ├── db.sqlite            # SQLite database
    └── downloads/          # Downloaded media files
```
