<p align="center">
  <img src="frontend/public/favicon.svg" width="80" height="80" alt="Wardrove">
</p>

<h1 align="center">Wardrove</h1>
<p align="center"><strong>The Wardriving MMORPG</strong></p>
<p align="center">
  Self-hosted platform that turns wireless network mapping into an RPG.<br/>
  Upload captures, visualize on maps, earn XP, unlock badges, climb the leaderboard.
</p>

---

## Stack

| Layer | Tech |
|-------|------|
| **Frontend** | React 19, TypeScript, Vite 6, Tailwind CSS 4, Zustand, Framer Motion, Recharts, Leaflet |
| **Backend** | Python 3.12, FastAPI 0.115, SQLAlchemy (async), Alembic |
| **Database** | PostgreSQL 16 + PostGIS |
| **Cache/Queue** | Redis 7, ARQ workers (2 replicas, 10 concurrent jobs each) |
| **Auth** | GitHub OAuth, JWT (access + refresh), API tokens |
| **Infra** | Docker Compose (5 services) |

## Quick Start

```bash
# 1. Clone
git clone https://github.com/youruser/wardrove && cd wardrove

# 2. Configure
cp .env.example .env
# Edit .env: set GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SECRET_KEY

# 3. Run
docker compose up -d

# Open http://localhost:8847
```

### GitHub OAuth Setup

1. Go to **GitHub → Settings → Developer settings → OAuth Apps → New**
2. Set **Homepage URL** to your app URL (e.g. `http://localhost:8847`)
3. Set **Callback URL** to `http://localhost:8847/api/v1/auth/callback/github`
4. Copy Client ID and Client Secret into `.env`

## Architecture

```
Browser (React 19 SPA)
  │
  ├─ /api/v1/*  →  FastAPI (port 8847)
  │                   ├─ PostgreSQL + PostGIS
  │                   └─ Redis (cache, queue, pub/sub)
  │
  └─ SSE streams  →  Redis pub/sub → real-time upload status
                      ARQ Workers (x2) → async file parsing
```

## Pages

| Route | Name | Description |
|-------|------|-------------|
| `/` | **Map** | Interactive dark map with WiFi/BT/Cell layers, heatmap, marker clusters, search |
| `/armory` | **Armory** | Bluetooth + Cell tower inventory with pagination and filters |
| `/leaderboard` | **Arena** | Player rankings with animated podium, sort by XP or WiFi count |
| `/stats` | **World** | Global stats: encryption distribution, channels, manufacturers, countries |
| `/quarters` | **Quarters** | Character sheet, badge grimoire, quest log, API token management |
| `/profile/:id` | **Profile** | Public player profile with level ring, trophy room |
| `/terms` | **Terms** | Terms of Service and data usage policy |

## RPG System

- **100 levels** — exponential curve (level 100 ≈ 5.94M XP)
- **13 ranks** — *Script Kiddie* → *Packet Peasant* → ... → *NSA's Most Wanted* → *The WiFi Itself*
- **61 badges** — 7 categories, tiers from Common to Mythic with glow effects
- **XP**: +1/WiFi, +2/BT, +3/Cell, +10/upload, +25 daily bonus

## Supported Formats

WiGLE CSV, Kismet (.netxml, .csv), KML/KMZ, NetStumbler (.ns1, .wiscan), iOS consolidated.db, DStumbler, MacStumbler (.plist)

## Development

```bash
# Backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend && npm install
npm run dev    # localhost:3000, proxies /api → :8000
npm run build  # → ../app/static/
```

## Security

- CORS restricted to configured `APP_URL` (no wildcard in production)
- JWT access tokens (60min) + httpOnly refresh cookies (30 days)
- Rate limiting: 100 req/min (auth), 50 (API token), 20 (anon)
- Upload size limit (100MB default), archive uploads disabled
- OAuth state parameter validation with Redis TTL
- SVG badge content sanitized on render
- All user-generated content HTML-escaped in map popups

## License

MIT — see [LICENSE](LICENSE)
