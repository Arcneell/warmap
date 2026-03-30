# Wardrove

```
 __    __  ___  ____  ____  ____  ____  _  _  ____
 \ \/\/ / / __)(  _ \(  _ \(  _ \(  _ \( \/ )( ___)
  \_/\_/  \__ \ )   / )(_) ))    / )(_) ))  (  )__)
           (___/(_)\_)(____/(_)\_)(____/(_/\_)(____)
```

**Self-hosted wardriving map & dashboard. Your personal WiGLE, on your own infrastructure.**

[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## What is Wardrove?

Wardrove is a lightweight, self-hosted alternative to WiGLE.net. Import your wardriving captures, visualize them on an interactive map, track your progress with an XP/leveling system, and own your data — no account, no cloud, no tracking.

Built for use with the **M5Stack Cardputer** running [M5PORKCHOP](https://github.com/recessburton/M5PORKCHOP) (WARHOG mode), but compatible with any tool that exports **WiGLE CSV v1.6**.

---

## Features

- **Interactive map** — Leaflet.js with OpenStreetMap tiles, marker clustering, click-to-details popups
- **Heatmap view** — toggle between markers and signal density heatmap (like WiGLE)
- **Multi-file upload** — drag & drop or browse, import multiple `.wigle.csv` files at once
- **Smart deduplication** — updates existing APs if signal is better or data is newer, never creates duplicates
- **Encryption breakdown** — donut chart + color-coded markers (WPA3 / WPA2 / WPA / WEP / Open)
- **Bluetooth devices page** — dedicated view for BT/BLE scanned devices with search
- **WiGLE CSV export** — export all your data in WiGLE-compatible format to re-import elsewhere
- **Profile & XP system** — wardriving RPG: level up as you discover new networks, earn ranks from *Script Kiddie* to *Omniscient Eye*
- **Persistent storage** — SQLite database mounted as a Docker volume, survives container rebuilds
- **REST API** — full API for automation (see below)
- **Single container** — one `docker compose up` and you're running

---

## Quick Start

```bash
git clone https://github.com/Arcneell/warmap.git
cd warmap
docker compose up -d --build
```

Open [http://localhost:8847](http://localhost:8847) — enter your pseudo and start importing.

**Requirements:** Docker + Docker Compose. That's it.

---

## Usage

### Import from the web UI

1. Click **Upload** in the top-right
2. Drag & drop one or more `.wigle.csv` files
3. The map updates automatically

### Import via curl (automation / scripts)

```bash
# Single file
curl -X POST http://localhost:8847/api/upload \
  -F "files=@20240615_WARHOG.wigle.csv"

# Multiple files at once
curl -X POST http://localhost:8847/api/upload \
  -F "files=@run1.wigle.csv" \
  -F "files=@run2.wigle.csv"
```

### Export all data

```bash
# Download as WiGLE CSV (compatible with WiGLE.net upload)
curl http://localhost:8847/api/export -o export.wigle.csv
```

### Automate from M5Stack Cardputer

```bash
#!/bin/bash
# Push today's capture to your Wardrove instance
FILE=$(ls -t *.wigle.csv | head -1)
curl -X POST http://YOUR_SERVER_IP:8847/api/upload -F "files=@$FILE"
```

---

## Map Controls

| Control | Description |
|---------|-------------|
| **Markers** | Color-coded circle markers, clustered by proximity |
| **Heatmap** | Signal density heatmap (intensity = RSSI strength) |
| Click a cluster | Spiderfies individual APs so all are clickable |
| Click a marker | Shows SSID, BSSID, encryption, channel, signal, timestamps |

### Marker colors

| Color | Encryption |
|-------|------------|
| 🟢 Green | WPA3 |
| 🔵 Blue | WPA2 |
| 🟠 Orange | WPA |
| 🔴 Red | WEP |
| ⚫ Gray | Open |

---

## XP & Ranks

Discover new networks to earn XP and level up. Designed so that mapping an entire island takes you to level 100.

| Level | XP needed | Rank |
|-------|-----------|------|
| 1 | 0 | Script Kiddie |
| 3 | 60 | Packet Sniffer |
| 5 | 200 | Signal Hunter |
| 8 | 560 | Spectrum Crawler |
| 12 | 1 320 | RF Scout |
| 16 | 2 400 | Wave Rider |
| 22 | 4 620 | Airspace Mapper |
| 30 | 8 700 | Ether Walker |
| 40 | 15 600 | Frequency Ghost |
| 55 | 29 700 | Wardriving Legend |
| 70 | 48 300 | Phantom Scanner |
| 85 | 71 400 | Radio God |
| 100 | 99 000 | Omniscient Eye |

*+1 XP per new unique AP discovered. +5 XP per upload session.*

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload one or more `.wigle.csv` files |
| `GET` | `/api/accesspoints` | List APs (params: `encryption`, `ssid`, `limit`, `offset`) |
| `GET` | `/api/accesspoints/geojson` | GeoJSON export (params: `encryption`, `ssid`) |
| `GET` | `/api/export` | Download full WiGLE CSV export |
| `GET` | `/api/bluetooth` | List BT/BLE devices (param: `search`) |
| `GET` | `/api/stats` | Global stats (totals, encryption breakdown, top SSIDs) |
| `GET` | `/api/sessions` | Upload session history |
| `GET` | `/api/profile` | Get user profile + XP/level |
| `POST` | `/api/profile` | Create profile `{"pseudo": "your_name"}` |
| `DELETE` | `/api/accesspoints/{id}` | Delete an AP by ID |

---

## WiGLE CSV Format

Wardrove fully supports **WiGLE CSV v1.6** — the format exported by WiGLE Android, iOS, and compatible firmware.

```
WigleWifi-1.6,appRelease=...,model=...,release=...,device=...,...
MAC,SSID,AuthMode,FirstSeen,Channel,RSSI,CurrentLatitude,CurrentLongitude,AltitudeMeters,AccuracyMeters,Type
AA:BB:CC:DD:EE:FF,MyNetwork,[WPA2-PSK-CCMP][ESS],2024-06-15 14:30:00,6,-45,-21.115,55.536,42.0,8.0,WIFI
```

Supported device types: `WIFI`, `BT`, `BLE`, `CELL`

---

## Configuration

Edit `docker-compose.yml` to change:

```yaml
services:
  wardrove:
    ports:
      - "8847:8000"     # Change host port here
    environment:
      - TZ=Indian/Reunion  # Your timezone
```

The SQLite database is stored in `./data/wardrove.db` (Docker volume). It persists across rebuilds.

---

## Project Structure

```
wardrove/
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── app/
│   ├── main.py               # FastAPI app
│   ├── database.py           # SQLite schema, XP system, migrations
│   ├── parser.py             # WiGLE CSV v1.6 parser
│   └── routes/
│       ├── upload.py         # POST /api/upload
│       ├── accesspoints.py   # GET /api/accesspoints, /geojson, /export, DELETE
│       └── stats.py          # GET /api/stats, /sessions, /profile
│   └── static/
│       ├── index.html        # SPA
│       ├── style.css
│       └── app.js
└── data/
    └── wardrove.db           # SQLite (Docker volume)
```

---

## Stack

- **Backend:** Python 3.12 + FastAPI + aiosqlite
- **Frontend:** Vanilla HTML/CSS/JS (no build step)
- **Map:** Leaflet.js + MarkerCluster + Leaflet.heat
- **Charts:** Chart.js
- **DB:** SQLite
- **Container:** Docker (single container, ~120MB image)

---

## License

MIT — see [LICENSE](LICENSE).

---

*Built with a M5Stack Cardputer, a lot of driving, and zero clouds.*
