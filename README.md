# Wardrove

Self-hosted wardriving platform with RPG progression. Map, collect, and compete.

## What is Wardrove?

Wardrove transforms wardriving data into an RPG experience. Upload your captures, discover WiFi networks, Bluetooth devices, and cell towers, earn XP, level up through 13 ranks from *Script Kiddie* to *Omniscient Eye*, and unlock 42 badges across 7 categories.

Think WiGLE, but self-hosted, with a progression system that makes data collection addictive.

## Features

### Data Collection
- Async import of wardriving captures (WiGLE CSV, Kismet, KML/KMZ, NetStumbler, iOS consolidated.db, DStumbler, MacStumbler)
- Multi-format auto-detection (extension + content inspection)
- Bulk processing with parallel workers (ARQ + Redis queue)
- Trilateration from multiple observations (RSSI-weighted centroid)

### Interactive Map
- WiFi networks with encryption color-coding and clustering
- Bluetooth device layer (BT + BLE)
- Cell tower layer (GSM, LTE, WCDMA, CDMA, 5G NR)
- Heatmap view mode
- Viewport-based tile loading with live refresh
- Search by SSID/BSSID, filter by encryption type

### RPG Progression
- **XP System**: earn XP for every new network discovered
- **13 Ranks**: Script Kiddie -> Packet Sniffer -> Signal Hunter -> ... -> Radio God -> Omniscient Eye
- **100 Levels**: exponential progression curve
- **42 Badges** across 7 categories:
  - WiFi milestones (10 -> 100K networks)
  - Bluetooth milestones (10 -> 5K devices)
  - Cell tower milestones (10 -> 5K towers)
  - Upload milestones (1 -> 500 files)
  - XP milestones (100 -> 100K XP)
  - Level milestones (5 -> 100)
  - Special badges (WEP Hunter, WPA3 Pioneer, Open Spotter...)
- Tiered badge rarity with visual glow effects (common -> legendary)

### Social
- Public player profiles with badge showcase
- Global leaderboard (sort by XP or WiFi discoveries)
- Clickable profiles from leaderboard
- Groups with group-specific leaderboards
- Dynamic SVG badge card per user (embeddable)

### Stats & Analytics
- Global stats dashboard (encryption distribution, top SSIDs, channels)
- Advanced stats (manufacturers/OUI, countries by MCC)
- Per-user discovery stats with XP progress visualization
- Upload history with real-time processing status (SSE)

### Export
- WiGLE CSV, KML, GeoJSON export
- Per-upload or global export
- REST API with token auth for automation

## Stack

| Component | Technology |
|-----------|------------|
| Backend | Python 3.12, FastAPI, SQLAlchemy async, ARQ workers |
| Database | PostgreSQL + PostGIS |
| Cache/Queue | Redis |
| Frontend | Vite, vanilla JS (ES6 modules), Leaflet, Chart.js |
| Infra | Docker Compose (app, worker x2, postgres, redis) |

## Quick Start

```bash
git clone https://github.com/Arcneell/warmap.git
cd warmap
cp .env.example .env
# Edit .env with your secrets
docker compose up -d --build
```

App: `http://localhost:8847`

## GitHub OAuth (required for login)

1. Create an OAuth App at [GitHub Developer Settings](https://github.com/settings/developers)
2. Set:
   - Homepage URL: `http://localhost:8847`
   - Callback URL: `http://localhost:8847/api/v1/auth/callback/github`
3. Add to `.env`:
   ```
   GITHUB_CLIENT_ID=your_client_id
   GITHUB_CLIENT_SECRET=your_client_secret
   APP_URL=http://localhost:8847
   ```
4. Restart: `docker compose up -d --build`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PASSWORD` | PostgreSQL password | `wardrove` |
| `SECRET_KEY` | JWT signing key | `change-me-in-production` |
| `APP_URL` | Public URL | `http://localhost:8847` |
| `GITHUB_CLIENT_ID` | OAuth client ID | -- |
| `GITHUB_CLIENT_SECRET` | OAuth secret | -- |
| `WORKER_MAX_JOBS` | Concurrent jobs per worker | `10` |

## API Reference

Base URL: `/api/v1`

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/login/github` | Start OAuth flow |
| GET | `/auth/callback/github` | OAuth callback |
| POST | `/auth/exchange` | Exchange code for token |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Clear session |
| GET | `/auth/me` | Current user info |
| GET/POST | `/auth/tokens` | List/create API tokens |
| DELETE | `/auth/tokens/{id}` | Revoke API token |

### Upload & Queue
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload files (multipart, field: `files`) |
| GET | `/upload` | Upload history |
| GET | `/upload/status/{id}` | Transaction status |
| GET | `/upload/status/{id}/stream` | SSE status stream |
| GET | `/queue/status` | Queue statistics |
| GET | `/queue/health` | Redis health check |

### Networks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/networks/wifi` | List WiFi (paginated, filterable) |
| GET | `/networks/wifi/geojson` | WiFi GeoJSON for map |
| GET | `/networks/wifi/count` | WiFi count in bbox |
| GET | `/networks/wifi/{bssid}` | WiFi detail |
| GET | `/networks/bt` | List Bluetooth |
| GET | `/networks/bt/geojson` | BT GeoJSON |
| GET | `/networks/bt/{mac}` | BT detail |
| GET | `/networks/cell` | List cell towers |
| GET | `/networks/cell/geojson` | Cell GeoJSON |
| GET | `/networks/cell/{id}` | Cell detail |

### Stats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Global platform stats |
| GET | `/stats/leaderboard` | Player leaderboard |
| GET | `/stats/channels` | WiFi channel distribution |
| GET | `/stats/encryption` | Encryption distribution |
| GET | `/stats/manufacturers` | Top manufacturers (OUI) |
| GET | `/stats/countries` | Countries by cell MCC |
| GET | `/stats/top-ssids` | Most common SSIDs |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profile` | Current user profile + stats |
| PUT | `/profile` | Update username |
| GET | `/profile/{user_id}` | Public profile + badges |
| GET | `/profile/u/{username}` | Profile by username |
| GET | `/profile/{user_id}/badges` | User badges (earned + locked) |
| GET | `/profile/{user_id}/badge.svg` | Embeddable SVG badge card |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/groups` | List all groups |
| POST | `/groups` | Create group |
| GET | `/groups/{id}` | Group detail + members |
| POST | `/groups/{id}/join` | Join group |
| DELETE | `/groups/{id}/leave` | Leave group |
| GET | `/groups/{id}/leaderboard` | Group leaderboard |

### Export
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/export/wigle-csv` | Export as WiGLE CSV |
| GET | `/export/kml` | Export all as KML |
| GET | `/export/kml/{id}` | Export upload as KML |
| GET | `/export/geojson` | Export as GeoJSON |

### Geocode
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/geocode/reverse` | Reverse geocode (Nominatim) |

## CLI Upload

```bash
# Upload with API token
curl -X POST http://localhost:8847/api/v1/upload \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -F "files=@capture.wigle.csv"

# Check status
curl http://localhost:8847/api/v1/upload/status/1
```

## Development

### Backend
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev     # Dev server with HMR
npm run build   # Build to app/static/
```

### Worker
```bash
python -m arq app.tasks.worker.WorkerSettings
```

## Architecture

```
wardrove/
├── app/
│   ├── main.py                 # FastAPI app + lifespan
│   ├── config.py               # Settings (env-based)
│   ├── database.py             # SQLAlchemy async engine + XP system
│   ├── models/                 # SQLAlchemy models
│   │   ├── user.py             # User + ApiToken
│   │   ├── network.py          # WifiNetwork, BtNetwork, CellTower
│   │   ├── observation.py      # WifiObservation (for trilateration)
│   │   ├── badge.py            # BadgeDefinition + UserBadge
│   │   ├── transaction.py      # UploadTransaction
│   │   ├── group.py            # Group + GroupMember
│   │   └── stats.py            # MonthlyStats
│   ├── routes/                 # API endpoints
│   │   ├── auth.py             # OAuth + JWT + API tokens
│   │   ├── upload.py           # File upload + queue
│   │   ├── networks.py         # Network CRUD + GeoJSON
│   │   ├── stats.py            # Stats + leaderboard
│   │   ├── profile.py          # User profiles + badges
│   │   ├── groups.py           # Group management
│   │   ├── export.py           # Data export (CSV/KML/GeoJSON)
│   │   ├── geocode.py          # Reverse geocoding
│   │   └── queue.py            # Queue status
│   ├── services/               # Business logic
│   │   ├── upload.py           # Bulk observation processing
│   │   ├── badges.py           # Badge evaluation engine
│   │   ├── xp.py               # XP/level/rank system
│   │   ├── stats.py            # Stats computation
│   │   ├── trilateration.py    # RSSI-weighted positioning
│   │   └── ...
│   ├── parsers/                # File format parsers
│   │   ├── registry.py         # Auto-detection + dispatch
│   │   ├── wigle_csv.py        # WiGLE CSV v1.6
│   │   ├── kismet.py           # Kismet .netxml + .csv
│   │   ├── kml.py              # KML/KMZ
│   │   └── ...
│   ├── tasks/                  # ARQ worker tasks
│   │   ├── worker.py           # Worker config
│   │   └── process_upload.py   # Upload pipeline
│   ├── middleware/             # Auth + rate limiting
│   └── static/                 # Built frontend (Vite output)
├── frontend/
│   ├── index.html              # SPA template
│   ├── src/
│   │   ├── main.js             # Entry point + routing
│   │   ├── pages/              # Page controllers
│   │   ├── components/         # UI components
│   │   └── styles/main.css     # All styling
│   └── package.json
├── docker-compose.yml          # app + worker x2 + postgres + redis
├── Dockerfile
└── requirements.txt
```

## License

MIT
