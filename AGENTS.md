# AGENTS.md

Instructions for AI agents working on the HomeTube project.

## Project Structure

```
hometube/
├── backend/
│   ├── main.py              # FastAPI app with REST endpoints
│   ├── models.py            # DB models (User, Video, Music, Channel, Subscription, Playlist)
│   ├── database.py          # SQLite configuration
│   ├── cli.py               # CLI for .ht export/import (python cli.py export/import)
│   ├── import_music.py      # Import local music files (supports mp3, webm, flac, wav, m4a, ogg)
│   ├── requirements.txt     # Python dependencies
│   └── services/
│       ├── ytdlp.py         # yt-dlp wrapper for downloads (preserves audio format)
│       └── scheduler.py     # Background subscription checker + auto-delete
├── frontend/
│   ├── src/
│   │   ├── App.vue         # Main Vue app with slide-out nav menu
│   │   ├── api.js          # API proxy – delegates to active provider (server or local)
│   │   ├── localDb.js      # IndexedDB wrapper (hometube-local DB with 8 object stores)
│   │   ├── providers/
│   │   │   ├── DataProvider.js    # Abstract provider interface
│   │   │   ├── ServerProvider.js  # HTTP provider – talks to FastAPI backend
│   │   │   ├── LocalProvider.js   # IndexedDB provider – offline mode
│   │   │   └── index.js          # Provider factory (detect mode, build, switch)
│   │   ├── pages/
│   │   │   ├── UserPage.vue           # User selection/creation
│   │   │   ├── SetupBackend.vue       # Initial setup: choose server or local mode
│   │   │   ├── VideoHome.vue          # Video feed, filters, in-app player (Plyr.js)
│   │   │   ├── AddVideo.vue           # Add video by URL with quality selection
│   │   │   ├── AddChannel.vue         # Browse channel videos / subscribe with rules
│   │   │   ├── MusicHome.vue          # Playlists view with My Songs/All Songs virtual playlists
│   │   │   ├── AddMusic.vue           # Add music by URL, create/select playlist
│   │   │   ├── PlaylistView.vue       # Full music player: album art, play/shuffle, controls
│   │   │   ├── ExportPage.vue         # Export data as .ht file
│   │   │   ├── ImportPage.vue         # Import .ht file into local mode
│   │   │   └── SettingsPage.vue       # Settings with server/local mode toggle
│   │   ├── stores/           # Pinia stores (music, etc.)
│   │   ├── composables/      # Vue composables
│   │   └── style.css
│   ├── package.json
│   └── vite.config.js      # Vite + PWA config
└── data/
    ├── db.sqlite            # SQLite database
    └── downloads/           # Downloaded media files
```

## Development Commands

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py               # Run server (add --dev for ngrok tunnel)
python cli.py export -o backup.ht   # Export database to .ht file
python cli.py import backup.ht      # Import .ht file into database
python import_music.py --folder /path --user-id 1  # Import local music
```

### Frontend
```bash
cd frontend
npm install
npm run dev        # Dev server
npm run build      # Production build
```

## Code Conventions

- **Backend**: Python with FastAPI, SQLAlchemy ORM, SQLite
- **Frontend**: Vue 3 Composition API, Tailwind CSS for styling
- **Icons**: Font Awesome via @fortawesome/vue-fontawesome
- **Video Player**: Plyr.js with custom controls (speed, audio mode, fullscreen)
- **API**: REST endpoints defined in `backend/main.py`; frontend calls go through an API proxy (`api.js`) that delegates to the active provider
- **Downloads**: Handled via yt-dlp in `backend/services/ytdlp.py`
- **Provider Pattern**: `DataProvider.js` defines an abstract interface. `ServerProvider.js` makes HTTP calls to the Python backend. `LocalProvider.js` uses IndexedDB for fully offline operation.
- **Mode Switching**: The frontend stores `localMode` in localStorage. `providers/index.js` detects the mode and builds the correct provider. All pages use the API proxy and never reference providers directly.
- **`.ht` files**: Zip archives containing `metadata.json` (serialized DB tables) and subdirectories `videos/` and `music/` with media files. The bridge between server mode and local mode.

## API Endpoints

### Videos
- `GET /api/videos?user_id=&filter=` - List videos (filter: all/my-feed/unwatched)
- `POST /api/videos/add` - Add video (body: url, user_id, quality)
- `POST /api/videos/{id}/watch` - Mark as watched
- `POST /api/videos/{id}/keep` - Toggle keep flag
- `POST /api/videos/{id}/download` - Download video
- `GET /api/videos/info?url=` - Get available formats for URL

### Music
- `GET /api/music?user_id=` - List music
- `POST /api/music/add` - Add music (body: url, user_id, playlist_id)
- `GET /api/music/info?url=` - Get music info
- `POST /api/music/{id}/download` - Download music (returns filename)
- `GET /api/music/{id}/file` - Serve music file with correct MIME type

### Serving Files
- `GET /api/files/videos/{filename}` - Serve video files (video/mp4)
- `GET /api/files/music/{filename}` - Serve music files (auto-detects MIME: mp3, webm, m4a, ogg, flac, wav)

### Playlists
- `GET /api/playlists?user_id=` - List playlists
- `POST /api/playlists` - Create playlist
- `POST /api/playlists/{id}/add` - Add song to playlist
- `DELETE /api/playlists/{id}/remove/{song_id}` - Remove song
- `DELETE /api/playlists/{id}` - Delete playlist

### Channels
- `POST /api/channels/add` - Add channel
- `GET /api/channels/{id}/videos` - Get channel videos
- `POST /api/channels/{id}/subscribe` - Subscribe with criteria

### Export / Import
- `POST /api/export` - Export database as .ht file (body: type, user_id, date_from, date_to, video_ids, music_ids)
- `POST /api/import` - Import .ht file into database (multipart file upload)

## Notes

- Backend serves the built frontend from `frontend/dist/`
- Scheduler runs in background checking subscriptions every 60 seconds
- Auto-delete: Videos watched >7 days ago without keep_flag are deleted
- PWA support via `vite-plugin-pwa`
- Audio mode uses Wake Lock API to allow screen-off listening
- PWA download uses Web Downloads API to save files to device
- Music downloads preserve original format (mp3, webm, m4a, ogg, flac, wav) via yt-dlp
- Import script (`import_music.py`) supports mp3, webm, flac, wav, m4a, ogg formats
- MusicHome.vue: "My Songs" and "All Songs" appear as clickable virtual playlists
- PlaylistView.vue UI:
  - Displays first song's album art at top
  - Shows current song title/artist when playing
  - Playback controls row (prev/play-pause/next) appears when a song is playing
  - Play and Shuffle buttons always visible
  - Shuffle and Repeat toggle buttons
  - Clickable song list to select and play tracks
- State Persistence (localStorage):
  - App state: active tab, sub-pages, selected playlist ID
  - Virtual playlist view ("My Songs"/"All Songs") persisted
  - Per-playlist shuffle state (key: `playlist_{id}_shuffled`)
  - State restores automatically on page refresh

### Server Mode vs Local Mode

The frontend can operate in two modes:

- **Server Mode** (default): Connects to the Python FastAPI backend via HTTP. Uses `ServerProvider` which makes REST calls to the backend URL stored in `localStorage` (`backendUrl`). Supports ServiceWorker caching for offline-capable music/playlist access.

- **Local Mode**: Runs entirely in the browser using IndexedDB. Uses `LocalProvider` which reads/writes to the `hometube-local` IndexedDB database (stores: users, channels, subscriptions, videos, music, playlists, settings, files, meta). Media files are stored as blobs in the `files` store.

Users choose the mode on the `SetupBackend.vue` page on first launch. Mode can be toggled later in `SettingsPage.vue`. Data from `.ht` files can be imported in either mode.

### `.ht` File Format

`.ht` files are zip archives used to transfer HomeTube data between instances and between modes. Structure inside the zip:

```
file.ht
├── metadata.json   # JSON: version, exported_at, users[], channels[], subscriptions[], videos[], music[], playlists[], settings[]
├── videos/
│   ├── abc123.mp4
│   └── ...
└── music/
    ├── song.mp3
    └── ...
```

Export sources:
- `POST /api/export` endpoint (server mode API)
- `python cli.py export` (terminal CLI, works directly on SQLite DB)
- Frontend export in local mode (packs IndexedDB data)

Import targets:
- `POST /api/import` endpoint (server mode API)
- `python cli.py import <file.ht>` (terminal CLI, writes to SQLite DB)
- Frontend import in local mode (populates IndexedDB)

- No test framework is currently configured
