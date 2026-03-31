# Wardrove

Self-hosted wardriving map + dashboard (FastAPI + PostgreSQL/PostGIS + Redis + frontend Vite).

## Fonctionnalités principales

- Import asynchrone de captures (`.wigle.csv`, Kismet, KML/KMZ, NetStumbler, archives)
- Carte WiFi + couches Bluetooth et Cell towers
- Stats avancées (leaderboard, canaux, chiffrement, fabricants, pays, top SSID)
- Authentification OAuth **GitHub uniquement**
- Export WiGLE CSV / KML / GeoJSON
- Système XP, niveaux, badges, groupes

## Stack actuelle

- Backend: Python 3.12, FastAPI, SQLAlchemy async, Alembic, ARQ
- Base de donnees: PostgreSQL + PostGIS
- Cache/queue: Redis
- Frontend: Vite (vanilla JS), build dans `app/static`
- Infra: Docker Compose (`app`, `worker`, `postgres`, `redis`)

## Demarrage rapide

```bash
git clone https://github.com/Arcneell/warmap.git
cd warmap
cp .env.example .env
docker compose up -d --build
```

Application: `http://localhost:8847`

## OAuth GitHub (obligatoire pour login)

1. Cree une OAuth App sur [GitHub Developers](https://github.com/settings/developers)
2. Configure:
   - Homepage URL: `http://localhost:8847`
   - Authorization callback URL: `http://localhost:8847/api/v1/auth/callback/github`
3. Renseigne dans `.env`:
   - `GITHUB_CLIENT_ID=...`
   - `GITHUB_CLIENT_SECRET=...`
   - `APP_URL=http://localhost:8847` (ou ton URL publique)
4. Redemarre:

```bash
docker compose up -d --build
```

## Variables d'environnement essentielles

Voir `.env.example`:

- `DB_PASSWORD`
- `SECRET_KEY`
- `APP_URL`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

## API (base: `/api/v1`)

### Auth

- `GET /auth/login/github`
- `GET /auth/callback/github`
- `POST /auth/exchange`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /auth/tokens`
- `POST /auth/tokens`
- `DELETE /auth/tokens/{token_id}`

### Upload / Queue

- `POST /upload` (multipart, champ `files`)
- `GET /upload/status/{transaction_id}`
- `GET /upload/status/{transaction_id}/stream`
- `GET /queue/status`
- `GET /queue/health`

### Reseaux

- `GET /networks/wifi`
- `GET /networks/wifi/{bssid}`
- `GET /networks/wifi/geojson`
- `GET /networks/wifi/count`
- `GET /networks/bt`
- `GET /networks/bt/{mac}`
- `GET /networks/bt/geojson`
- `GET /networks/cell`
- `GET /networks/cell/{tower_id}`
- `GET /networks/cell/geojson`

### Stats / Profil / Groupes / Export / Geocode

- `GET /stats/leaderboard`
- `GET /stats/channels`
- `GET /stats/encryption`
- `GET /stats/manufacturers`
- `GET /stats/countries`
- `GET /stats/top-ssids`
- `GET /profile/{user_id}`
- `GET /profile/{user_id}/badges`
- `GET /profile/{user_id}/badge.svg`
- `GET /groups/{group_id}`
- `POST /groups/{group_id}/join`
- `DELETE /groups/{group_id}/leave`
- `GET /groups/{group_id}/leaderboard`
- `GET /export/wigle-csv`
- `GET /export/kml`
- `GET /export/kml/{transaction_id}`
- `GET /export/geojson`
- `GET /geocode/reverse`

## Frontend (dev)

```bash
cd frontend
npm install
npm run dev
```

Build prod (genere `app/static`):

```bash
npm run build
```

## Licence

MIT (`LICENSE`)
