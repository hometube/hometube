# AGENTS.md

Instructions for AI agents working on the HomeTube project.

## Project Structure

```
hometube/
├── backend/
│   ├── main.py              # FastAPI app with REST endpoints
│   ├── models.py            # DB models (User, Video, Music, Channel, Subscription)
│   ├── database.py          # SQLite configuration
│   ├── requirements.txt     # Python dependencies
│   └── services/
│       ├── ytdlp.py         # yt-dlp wrapper for downloads
│       └── scheduler.py     # Background subscription checker
├── frontend/
│   ├── src/
│   │   ├── App.vue          # Main Vue app with tab navigation
│   │   ├── pages/           # UserPage, VideoPage, MusicPage
│   │   └── api.js           # API client
│   ├── package.json
│   └── vite.config.js       # Vite + PWA config
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
- **API**: REST endpoints defined in `backend/main.py`
- **Downloads**: Handled via yt-dlp in `backend/services/ytdlp.py`

## Notes

- Backend serves the built frontend from `frontend/dist/`
- Scheduler runs in background checking subscriptions every 60 seconds
- PWA support via `vite-plugin-pwa`
- No test framework is currently configured
