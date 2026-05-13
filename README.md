# HomeTube

A self-hosted YouTube media downloader with a mobile-friendly web interface. Download videos and music from YouTube for offline viewing/listening, subscribe to channels, and automatically detect new uploads. Works in **server mode** (Python backend with SQLite) or **local mode** (fully offline in the browser via IndexedDB).

## Features

- **Video Downloads** - Paste YouTube URLs to download MP4 files with selectable quality (1080p/720p/480p/best)
- **Music Downloads** - Extract audio from videos/playlists, preserve original format (mp3, webm, m4a, ogg, flac, wav), organize into playlists
- **Import Existing Music** - Import songs from existing folders with automatic metadata extraction
- **Channel Subscriptions** - Subscribe to channels and auto-detect new videos with keyword/length/quality filters
- **Video Player** - In-app player with speed control (0.5x-2x), audio mode (screen-off listening), fullscreen
- **Smart Feed** - Video feed sorted by recency, filter by "My Feed" / "All Videos" / "Unwatched"
- **Watch Tracking** - Videos auto-marked as watched, with "Keep" flag to prevent auto-delete
- **Auto-Cleanup** - Watched videos automatically deleted after 7 days (unless kept)
- **Playlist Management** - Create playlists, add songs, shuffle/repeat playback
- **Multi-User Support** - Multiple users with separate collections
- **Server Mode** - Connect to a Python/FastAPI backend with SQLite storage, yt-dlp downloads, background scheduler
- **Local Mode** - Fully offline operation in the browser via IndexedDB, no server needed
- **Portable Data (.ht)** - Export/import your entire collection as `.ht` archive files to move between modes and instances
- **CLI Export/Import** - Manage `.ht` archives from the terminal with `python cli.py export` / `python cli.py import`
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

#### Option 1: Standard Development (Hot Reload)
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

#### Option 2: Development with Public URL (for GitHub Pages testing)
This mode automatically sets up an ngrok tunnel to expose your local backend securely:

```bash
# Terminal: Backend with ngrok tunnel
cd backend
pip install -r requirements.txt
python main.py --dev
# This will show you a public URL to use with your GitHub Pages frontend
```

When running with `--dev`, the backend will:
1. Automatically start an ngrok tunnel to your local port
2. Display a secure public URL with an embedded token
3. You can use this URL directly in your GitHub Pages frontend
4. The token provides basic protection against unauthorized access

Example output:
```
============================================================
🚀 HomeTube Development Server Ready!
============================================================
Local API:     http://localhost:8000
Public URL:    https://abc123.ngrok.io
For github.io: https://abc123.ngrok.io/api?token=your-secret-token-here
============================================================
Share the 'For github.io' URL with your frontend to enable
secure access to your local backend via GitHub Pages.
============================================================
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

### Server Mode vs Local Mode

- **Server Mode** (default): Connect to a Python backend. Enter the backend URL on setup or paste one shared via `--dev` mode. All data is stored in SQLite on the server. Media downloads use yt-dlp.
- **Local Mode**: Runs entirely in your browser using IndexedDB — no server needed. Import an `.ht` file on setup to populate your local collection. Media and metadata are stored client-side. Switch modes in Settings at any time.

### Exporting and Importing Data (`.ht` files)

Data can be transferred between modes and instances using `.ht` archive files:

```bash
# Export from server (CLI)
cd backend
python cli.py export -o backup.ht
python cli.py export --user-id 1 -o backup.ht    # Export specific user

# Import into server (CLI)
python cli.py import backup.ht

# Export from API
curl -X POST http://localhost:8000/api/export -H "Authorization: Bearer <token>" -o backup.ht

# Import via API
curl -X POST http://localhost:8000/api/import -F "file=@backup.ht" -H "Authorization: Bearer <token>"
```

You can also export/import from the frontend UI in both modes.

### Import Existing Music Collection

Import songs from an existing folder into HomeTube with automatic metadata extraction:

```bash
cd backend

# List users to get your user ID
python import_music.py --list-users

# (Optional) List playlists
python import_music.py --list-playlists --user-id 1

# Import music files (copies by default)
python import_music.py --folder /path/to/your/music --user-id 1

# Import and add to a specific playlist
python import_music.py --folder /path/to/your/music --user-id 1 --playlist-id 1

# Move files instead of copying
python import_music.py --folder /path/to/your/music --user-id 1 --move
```

Supports: MP3, FLAC, WAV, M4A, AAC, OGG. Extracts title, artist, and album from file metadata.

## Project Structure

```
hometube/
├── backend/
│   ├── main.py              # FastAPI app with REST endpoints
│   ├── models.py            # DB models (User, Video, Music, Channel, Subscription, Playlist)
│   ├── database.py          # SQLite configuration
│   ├── cli.py               # CLI for .ht export/import
│   ├── import_music.py      # Import existing music files
│   ├── requirements.txt     # Python dependencies
│   └── services/
│       ├── ytdlp.py         # yt-dlp wrapper for downloads
│       └── scheduler.py     # Background subscription checker + auto-delete
├── frontend/
│   ├── src/
│   │   ├── App.vue         # Main Vue app with slide-out nav menu
│   │   ├── api.js          # API proxy – delegates to active provider
│   │   ├── localDb.js      # IndexedDB wrapper (local mode storage)
│   │   ├── providers/
│   │   │   ├── DataProvider.js    # Abstract provider interface
│   │   │   ├── ServerProvider.js  # HTTP provider for server mode
│   │   │   ├── LocalProvider.js   # IndexedDB provider for local mode
│   │   │   └── index.js          # Provider factory (detect, build, switch)
│   │   ├── pages/
│   │   │   ├── UserPage.vue
│   │   │   ├── SetupBackend.vue       # Initial mode selection
│   │   │   ├── VideoHome.vue          # Video feed + player
│   │   │   ├── AddVideo.vue           # Add video by URL
│   │   │   ├── AddChannel.vue         # Channel browser + subscribe
│   │   │   ├── MusicHome.vue          # Playlists + songs
│   │   │   ├── AddMusic.vue           # Add music by URL
│   │   │   ├── PlaylistView.vue       # Music player with queue
│   │   │   ├── ExportPage.vue         # Export .ht files
│   │   │   ├── ImportPage.vue         # Import .ht files
│   │   │   └── SettingsPage.vue       # Mode toggle, settings
│   │   ├── stores/
│   │   ├── composables/
│   │   └── style.css
│   ├── package.json
│   └── vite.config.js      # Vite + PWA config
└── data/
    ├── db.sqlite            # SQLite database
    └── downloads/           # Downloaded media files
```
