# Wardrove — Project Specifications

## Vision

Self-hosted wardriving MMORPG platform. Upload captures from any wardriving tool, visualize on an interactive dark map, earn XP, level up through 100 levels, unlock 61 badges, and compete on global leaderboards. Designed for M5Stack Cardputer (WARHOG firmware) but compatible with any WiGLE CSV-compatible tool.

## Core Features

### Network Mapping
- Interactive dark-themed Leaflet map with CARTO dark tiles
- WiFi networks color-coded by encryption (WPA3=green, WPA2=cyan, WPA=amber, WEP=red, Open=gray)
- Bluetooth devices (indigo) and Cell towers (amber) as toggleable layers
- Marker clustering at zoom <17, heatmap view mode
- SSID/BSSID search with map centering
- Viewport-based GeoJSON loading with encryption/ownership filters

### RPG Progression
- **100 levels** with exponential curve: `level * (level-1) * (level+20) * 5`
- Level 100 requires ~5.94M XP
- **13 rank titles** with tech humor flavor text:
  - Lvl 1: Script Kiddie — *"sudo make me a sandwich"*
  - Lvl 3: Packet Peasant — *"tcpdump and chill"*
  - Lvl 5: SSID Stalker — *"Sees networks everywhere"*
  - Lvl 8: Deauth Apprentice — *"Hands off aireplay, padawan"*
  - Lvl 12: Wardrive-by Shooter — *"Drive slow, scan fast"*
  - Lvl 16: Man-in-the-Middle Earth — *"One ring to sniff them all"*
  - Lvl 22: Rogue AP Exorcist — *"Who you gonna call?"*
  - Lvl 30: Root Shell Ronin — *"rm -rf /doubt"*
  - Lvl 40: Frequency Ghost — *"2.4GHz? I don't even see it anymore"*
  - Lvl 55: Kismet Whisperer — *"The packets speak to me"*
  - Lvl 70: Shadow Broker — *"I know every BSSID in this city"*
  - Lvl 85: NSA's Most Wanted — *"They monitor me back"*
  - Lvl 100: The WiFi Itself — *"I am the 802.11 protocol"*

### XP Sources
| Action | XP |
|--------|-----|
| New WiFi AP discovered | +1 |
| New BT device discovered | +2 |
| New Cell tower discovered | +3 |
| Network metadata update | +0.1 |
| Upload session | +10 |
| First upload of the day | +25 |
| 7-day upload streak | +100 |

### Badge System (61 badges)

**WiFi Discovery** (10 tiers, 10 → 500,000):
Noob Scanner → SSID Collector → Hotspot Hoarder → Access Point Addict → RF Cartographer → Wardriving Veteran → Spectrum Overlord → The Omniscient → 802.11 Demigod → The WiFi Itself

**Bluetooth Hunting** (8 tiers, 10 → 50,000):
Bluetooth Curious → Pairing Enthusiast → BLE Stalker → Bluetooth Bender → The Tooth Fairy → Frequency Hoarder → BLE Whisperer → King Harald

**Tower Defense** (8 tiers, 10 → 50,000):
Tower Spotter → Cell Seeker → IMSI Catcher Catcher → Grid Architect → Telco Overlord → Infrastructure Oracle → Spectrum Sovereign → The Base Station

**Feed the Machine** (8 tiers, 1 → 2,500):
First Blood → Regular Feeder → Data Pusher → Pipeline Operator → Data Firehose → The Upload God → Bandwidth Incarnate → The ETL Pipeline

**XP Milestones** (8 tiers, 100 → 5,000,000):
First Sparks → Warming Up → Getting Serious → Veteran Status → XP Hoarder → Grind Lord → Millionaire → Transcendent

**Level Milestones** (8 tiers, 5 → 100):
SSID Stalker → RF Scout → Wave Rider → Root Shell Ronin → Frequency Ghost → Shadow Broker → NSA's Most Wanted → The WiFi Itself

**Special Ops** (9 badges):
WEP Archaeologist (10/100/500), Open Season (50/500/2000), WPA3 Pioneer/Evangelist/Prophet (50/500/5000)

### Badge Tiers (visual)
| Tier | Rarity | Color | Effect |
|------|--------|-------|--------|
| 1 | Common | Gray | Simple border |
| 2 | Uncommon | Green | Light glow |
| 3 | Rare | Blue | Glow + shimmer |
| 4 | Epic | Purple | Intense glow |
| 5 | Legendary | Gold | Pulsing glow |
| 6-10 | Mythic | Pink/Rose | Animated aura |

### File Format Support
- WiGLE CSV v1.6
- Kismet NetXML + CSV
- KML / KMZ
- NetStumbler (.ns1 binary, .wiscan text)
- iOS consolidated.db (SQLite)
- DStumbler (key:value)
- MacStumbler (plist)

### Data Processing Pipeline
1. Upload → Store in Redis (4h TTL)
2. Parse → Auto-detect format, extract observations
3. Deduplicate → Batch pre-fetch (2000/batch), INSERT or UPDATE
4. Trilaterate → RSSI-weighted centroid for position refinement
5. XP + Badges → Award XP, evaluate badge criteria
6. Cache invalidation → Stats cache (5min TTL)
7. Publish status → Redis pub/sub → SSE to client

### Export
- WiGLE CSV (streaming)
- KML (per-upload or full)
- GeoJSON (with filtering)

### Social Features
- Public player profiles with embeddable SVG badge cards
- Global leaderboard (sort by XP or WiFi count)
- Guild system (create, join, group leaderboards)

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind CSS 4
- **State**: Zustand (auth, map, UI stores)
- **Animations**: Framer Motion (page transitions, badge effects)
- **Charts**: Recharts (encryption pie, channel bars)
- **Map**: Leaflet + MarkerCluster + Heatmap
- **Backend**: FastAPI + SQLAlchemy async + asyncpg
- **Database**: PostgreSQL 16 + PostGIS
- **Cache/Queue**: Redis 7 + ARQ
- **Auth**: GitHub OAuth + JWT + API tokens
- **Deployment**: Docker Compose (app, 2 workers, postgres, redis)
