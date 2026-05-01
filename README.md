# HomeTube

A self-hosted YouTube media downloader with a mobile-friendly web interface. Download videos and music from YouTube for offline viewing/listening, subscribe to channels, and automatically detect new uploads.

## Features

- **Video Downloads** - Paste YouTube URLs to download MP4 files
- **Music Downloads** - Extract audio from videos/playlists as MP3 files
- **Channel Subscriptions** - Subscribe to channels and auto-detect new videos
- **Keyword Filtering** - Filter which videos get added from subscriptions
- **Multi-User Support** - Multiple users with separate collections
- **Progressive Web App** - Mobile-optimized, installable on phones
- **Automatic Scheduling** - Background service checks subscriptions every 60 seconds

## Tech Stack

- **Backend**: Python, FastAPI, SQLAlchemy, SQLite
- **Frontend**: Vue 3, Vite, Tailwind CSS
- **Downloads**: yt-dlp

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
```

Runs on `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Development server on `http://localhost:5173`. For production, run `npm run build` (served by backend).

### Environment Variables

- `DB_PATH` - SQLite database path (default: `data/db.sqlite`)
- `DL_DIR` - Download directory (default: `data/downloads`)

## Usage

1. Open the web interface and create/select a user
2. **Videos**: Paste YouTube URLs to download, or subscribe to channels
3. **Music**: Paste song/playlist URLs to extract audio as MP3
4. **Subscriptions**: Add channels with optional keyword filters to auto-add new videos
