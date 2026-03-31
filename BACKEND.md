# Backend Specifications

## Database (PostgreSQL + PostGIS)

### Core Tables

#### `users`
```sql
id SERIAL PRIMARY KEY,
username VARCHAR(64) UNIQUE NOT NULL,
email VARCHAR(255) UNIQUE,
xp BIGINT DEFAULT 0,
avatar_url TEXT,
oauth_provider VARCHAR(32),
oauth_id VARCHAR(128),
is_admin BOOLEAN DEFAULT FALSE,
is_active BOOLEAN DEFAULT TRUE,
created_at TIMESTAMPTZ DEFAULT NOW(),
last_login TIMESTAMPTZ
```

#### `wifi_networks`
```sql
id SERIAL PRIMARY KEY,
bssid VARCHAR(17) UNIQUE NOT NULL,    -- MAC address (dedup key)
ssid TEXT DEFAULT '',
encryption VARCHAR(16) DEFAULT 'Unknown',  -- WPA3, WPA2, WPA, WEP, Open, Unknown
channel INTEGER DEFAULT 0,
frequency INTEGER DEFAULT 0,
rssi INTEGER DEFAULT -100,            -- best observed signal (dBm)
latitude DOUBLE PRECISION,
longitude DOUBLE PRECISION,
altitude DOUBLE PRECISION,
accuracy DOUBLE PRECISION,
first_seen TIMESTAMPTZ NOT NULL,
last_seen TIMESTAMPTZ NOT NULL,
seen_count INTEGER DEFAULT 1,
discovered_by INTEGER REFERENCES users(id),
last_updated_by INTEGER REFERENCES users(id)
```

#### `wifi_observations`
```sql
id BIGSERIAL PRIMARY KEY,
network_id INTEGER REFERENCES wifi_networks(id),
transaction_id INTEGER REFERENCES upload_transactions(id),
user_id INTEGER REFERENCES users(id),
rssi INTEGER,
latitude DOUBLE PRECISION,
longitude DOUBLE PRECISION,
altitude DOUBLE PRECISION,
accuracy DOUBLE PRECISION,
seen_at TIMESTAMPTZ
```
Used for trilateration: multiple observations of the same network allow RSSI-weighted centroid positioning.

#### `bt_networks`
```sql
id SERIAL PRIMARY KEY,
mac VARCHAR(17) UNIQUE NOT NULL,
name TEXT DEFAULT '',
device_type VARCHAR(4) DEFAULT 'BT',  -- BT or BLE
rssi INTEGER DEFAULT -100,
latitude DOUBLE PRECISION,
longitude DOUBLE PRECISION,
first_seen TIMESTAMPTZ,
last_seen TIMESTAMPTZ,
seen_count INTEGER DEFAULT 1,
discovered_by INTEGER REFERENCES users(id)
```

#### `cell_towers`
```sql
id SERIAL PRIMARY KEY,
radio VARCHAR(8),           -- GSM, LTE, WCDMA, CDMA, NR
mcc INTEGER, mnc INTEGER, lac INTEGER, cid INTEGER,
rssi INTEGER DEFAULT -100,
latitude DOUBLE PRECISION,
longitude DOUBLE PRECISION,
first_seen TIMESTAMPTZ,
last_seen TIMESTAMPTZ,
seen_count INTEGER DEFAULT 1,
discovered_by INTEGER REFERENCES users(id),
UNIQUE (radio, mcc, mnc, lac, cid)
```

#### `upload_transactions`
```sql
id SERIAL PRIMARY KEY,
user_id INTEGER REFERENCES users(id),
filename TEXT NOT NULL,
file_size INTEGER,
file_format VARCHAR(32),
status VARCHAR(16) DEFAULT 'pending',  -- pending -> parsing -> trilaterating -> done | error
status_message TEXT,
wifi_count INTEGER DEFAULT 0,
bt_count INTEGER DEFAULT 0,
ble_count INTEGER DEFAULT 0,
cell_count INTEGER DEFAULT 0,
gps_points INTEGER DEFAULT 0,
new_networks INTEGER DEFAULT 0,
updated_networks INTEGER DEFAULT 0,
skipped_networks INTEGER DEFAULT 0,
xp_earned INTEGER DEFAULT 0,
uploaded_at TIMESTAMPTZ DEFAULT NOW(),
completed_at TIMESTAMPTZ
```

#### `badge_definitions`
```sql
id SERIAL PRIMARY KEY,
slug VARCHAR(64) UNIQUE NOT NULL,
name VARCHAR(128) NOT NULL,
description TEXT,
icon_emoji VARCHAR(8),
category VARCHAR(32),       -- wifi, bluetooth, cell, upload, xp, level, special
tier INTEGER DEFAULT 1,     -- visual rarity (1=common, 8=mythic)
criteria_type VARCHAR(32),  -- wifi_count, bt_count, upload_count, xp, level, wep_count, etc.
criteria_value INTEGER
```

#### `user_badges`
```sql
user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
badge_id INTEGER REFERENCES badge_definitions(id),
earned_at TIMESTAMPTZ DEFAULT NOW(),
PRIMARY KEY (user_id, badge_id)
```

#### `groups`, `group_members`
Team system with admin/member roles and group-specific leaderboards.

#### `monthly_stats`
Aggregated per-user monthly stats with rank calculation.

## File Parsing

### Supported Formats

| Format | Extension | Detection |
|--------|-----------|-----------|
| WiGLE CSV v1.6 | `.wigle.csv`, `.csv` | Header "WigleWifi" or MAC/SSID columns |
| Kismet NetXML | `.netxml`, `.kismet.netxml` | XML with `wireless-network` |
| Kismet CSV | `.kismet.csv` | Semicolon-delimited with Network/BSSID |
| KML/KMZ | `.kml`, `.kmz` | XML with `kml` namespace |
| NetStumbler | `.ns1` | Binary NS1 format |
| NetStumbler Text | `.wiscan`, `.txt` | Tab-separated with MAC addresses |
| Consolidated.db | `.db` | SQLite with wifilocation/celllocation tables |
| DStumbler | -- | Key:Value format with BSSID/SSID |
| MacStumbler | `.plist` | XML or binary plist |

Detection order: extension map -> content inspection -> extension fallback.

### Encryption Classification (AuthMode)

1. Contains `WPA3` or `SAE` -> `WPA3`
2. Contains `WPA2` or `RSN` -> `WPA2`
3. Contains `WPA` -> `WPA`
4. Contains `WEP` -> `WEP`
5. Contains `[` but none of above -> `Open`
6. Empty or unparseable -> `Unknown`

### Dedup Logic

Per observation:
1. Lookup network by BSSID (bulk pre-fetch per batch)
2. If new -> INSERT network + observation, count as "new"
3. If exists -> UPDATE metadata if better (RSSI, last_seen, SSID, encryption), INSERT observation, count as "updated" or "skipped"
4. Skip if lat/lon = 0,0 (no GPS fix)

### Processing Pipeline

```
File in Redis -> Parse (thread pool) -> Bulk process observations -> Trilaterate -> XP + Badges -> Done
```

- Batch size: 2000 observations
- Bulk pre-fetch: all BSSIDs in batch via `WHERE IN (...)` (1 query instead of N)
- Bulk insert: `db.add_all()` for observations
- Trilateration: fetch all observations for affected networks in 1 query

## XP & Level System

- `XP_PER_IMPORT = 1` (per new WiFi network)
- `XP_PER_SESSION = 5` (per upload)
- BT/BLE: `new_bt_count // 2` XP
- Level formula: `level * (level-1) * (level+20) * 5`
- Level 100 (max) requires ~5.94M XP

### Rank Titles

| Level | Rank |
|-------|------|
| 1 | Script Kiddie |
| 3 | Packet Sniffer |
| 5 | Signal Hunter |
| 8 | Spectrum Crawler |
| 12 | RF Scout |
| 16 | Wave Rider |
| 22 | Airspace Mapper |
| 30 | Ether Walker |
| 40 | Frequency Ghost |
| 55 | Wardriving Legend |
| 70 | Phantom Scanner |
| 85 | Radio God |
| 100 | Omniscient Eye |

## Worker Configuration

- Queue: ARQ (async Redis queue)
- Workers: 2 replicas, 10 concurrent jobs each
- Job timeout: 30 minutes
- Max retries: 3
- Stale cleanup: marks transactions >20min old as "error" on worker restart
- Redis file TTL: 4 hours

## API Authentication

- **OAuth**: GitHub only (state stored in Redis, 5min TTL)
- **JWT**: 60-minute access token, 30-day refresh token (httpOnly cookie)
- **API tokens**: bcrypt-hashed, bearer auth for programmatic access
- **Rate limiting**: 100 req/min (auth), 50 (API token), 20 (anon)
