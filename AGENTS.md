# AGENTS.md

Instructions for AI agents working on the HomeTube project.

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
│   │   ├── App.vue         # Main Vue app with slide-out nav menu
│   │   ├── api.js          # API client (get, post, delete, downloadFile)
│   │   ├── pages/
│   │   │   ├── UserPage.vue     # User selection/creation
│   │   │   ├── VideoHome.vue    # Video feed, filters, in-app player (Plyr.js)
│   │   │   ├── AddVideo.vue     # Add video by URL with quality selection
│   │   │   ├── AddChannel.vue   # Browse channel videos / subscribe with rules
│   │   │   ├── MusicHome.vue    # Playlists view, song listings
│   │   │   ├── AddMusic.vue     # Add music by URL, create/select playlist
│   │   │   └── PlaylistView.vue # Full music player with queue management
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
python main.py
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
- **API**: REST endpoints defined in `backend/main.py`
- **Downloads**: Handled via yt-dlp in `backend/services/ytdlp.py`

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
- `POST /api/music/{id}/download` - Download music

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

## Notes

- Backend serves the built frontend from `frontend/dist/`
- Scheduler runs in background checking subscriptions every 60 seconds
- Auto-delete: Videos watched >7 days ago without keep_flag are deleted
- PWA support via `vite-plugin-pwa`
- Audio mode uses Wake Lock API to allow screen-off listening
- PWA download uses Web Downloads API to save files to device
- No test framework is currently configured
