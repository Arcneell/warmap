# Wardrove — Self-hosted Wardriving Platform with RPG Progression

## Vision

Self-hosted wardriving platform that turns data collection into an RPG. Upload captures from any wardriving tool, visualize on an interactive map, earn XP, level up, unlock badges, and compete on leaderboards. Designed for M5Stack Cardputer (WARHOG firmware) but compatible with any WiGLE CSV-compatible tool.

## Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.12, FastAPI, SQLAlchemy async (asyncpg) |
| Database | PostgreSQL 16 + PostGIS |
| Cache/Queue | Redis 7 |
| Worker | ARQ (async Redis queue), 2 replicas, 10 concurrent jobs each |
| Frontend | Vite 6, vanilla ES6 modules, Leaflet 1.9, Chart.js 4 |
| Infra | Docker Compose (4 services: app, worker, postgres, redis) |

## Core Features

### 1. Multi-Format File Import
- Drag & drop or API upload (`POST /api/v1/upload`)
- Auto-detect format: WiGLE CSV, Kismet (.netxml, .csv), KML/KMZ, NetStumbler (.ns1, text, wiscan), consolidated.db (iOS), DStumbler, MacStumbler
- Async processing via ARQ workers with Redis queue
- Bulk DB operations (batch pre-fetch + batch insert) for performance
- CPU-bound parsing offloaded to thread pool
- Real-time status via SSE or polling

### 2. Interactive Map
- Leaflet with MarkerCluster and heatmap layers
- 3 network types: WiFi (color-coded by encryption), Bluetooth (BT/BLE), Cell towers
- Viewport-based tile loading, live refresh every 5s
- Search by SSID/BSSID, filter by encryption type
- "Mine only" toggle for authenticated users

### 3. RPG Progression System
- **XP**: +1 per new WiFi network, +0.5 per BT device, +5 per upload session
- **100 levels** with exponential curve: `level * (level-1) * (level+20) * 5`
- **13 rank titles**: Script Kiddie (1) -> Packet Sniffer (3) -> Signal Hunter (5) -> ... -> Radio God (85) -> Omniscient Eye (100)
- **42 badges** in 7 categories with 5-8 tiers each
- Tiered visual rarity: common (gray) -> uncommon (green) -> rare (blue) -> epic (purple) -> legendary (gold) -> mythic (red glow)
- Animated XP bars, badge glow effects, level ring SVG

### 4. Social Features
- Public player profiles with avatar, rank, badges showcase
- Profile lookup by user ID or username
- Global leaderboard (sort by XP or WiFi discoveries)
- Clickable profiles from leaderboard
- Groups with per-group leaderboards
- Embeddable SVG badge card per user

### 5. Stats & Analytics
- Global: encryption distribution, top SSIDs, channel distribution
- Advanced: manufacturers (OUI lookup), countries (MCC), top SSIDs
- Per-user: discoveries, upload history, XP progression
- All stats cached in Redis (5-minute TTL)

### 6. Data Export
- WiGLE CSV, KML, GeoJSON formats
- Per-upload or global export
- API token auth for automated workflows

### 7. Trilateration
- RSSI-weighted centroid positioning
- Improves accuracy with multiple observations of the same network
- Batch recalculation after uploads

## Architecture

```
Client (Browser)
  |
  v
FastAPI App (port 8847)
  ├── Static files (Vite build)
  ├── REST API (/api/v1/*)
  ├── OAuth (GitHub)
  └── SSE (upload status)
  |
  v
Redis
  ├── File storage (upload content, TTL 4h)
  ├── Job queue (ARQ)
  ├── Stats cache (5min TTL)
  ├── Rate limiting
  └── Pub/Sub (status updates)
  |
  v
ARQ Workers (x2, 10 jobs each)
  ├── Parse file (thread pool)
  ├── Bulk insert/update networks
  ├── Trilaterate positions
  ├── Update XP + evaluate badges
  └── Invalidate stats cache
  |
  v
PostgreSQL + PostGIS
  ├── users, api_tokens
  ├── wifi_networks, bt_networks, cell_towers
  ├── wifi_observations
  ├── upload_transactions
  ├── badge_definitions, user_badges
  ├── groups, group_members
  └── monthly_stats
```
