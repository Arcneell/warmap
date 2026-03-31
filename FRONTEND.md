# Frontend Specifications

## Architecture

Vanilla JavaScript SPA with ES6 modules, built with Vite. No framework.

| File | Purpose |
|------|---------|
| `main.js` | Entry point, route registration, module init |
| `router.js` | Hash-based SPA router (#map, #bluetooth, etc.) |
| `state.js` | Reactive state store (auth, filters, view mode) |
| `api.js` | `authFetch` wrapper with auto token refresh |
| `auth.js` | GitHub OAuth flow, JWT management |
| `utils.js` | DOM helpers, HTML escape |

### Pages (8 routes)

| Route | Page | Description |
|-------|------|-------------|
| `#map` | Map + Sidebar | Interactive Leaflet map with WiFi/BT/Cell layers |
| `#bluetooth` | Bluetooth | Paginated BT/BLE device table |
| `#cell` | Cell Towers | Paginated cell tower table with radio filter |
| `#leaderboard` | Leaderboard | RPG-styled player rankings |
| `#advanced-stats` | Stats | Channels, encryption, manufacturers, countries, SSIDs |
| `#my-stats` | My Stats | RPG profile with XP ring, badges, discoveries |
| `#uploads` | Uploads | Upload history with real-time status |
| `#profile` | Profile | Public player profile (from leaderboard click) |

### Components

| Component | Description |
|-----------|-------------|
| `upload.js` | Upload modal with drag & drop, progress, status polling |

## Dependencies (CDN)

- **Leaflet** 1.9.4 + MarkerCluster + Heat
- **Chart.js** 4

## Design System

### Fonts
- UI: `Space Grotesk` (Google Fonts)
- Data/mono: `JetBrains Mono` (Google Fonts)

### Colors (CSS Variables)

```css
--bg-primary: #f5f6f8;
--bg-card: #ffffff;
--accent: #0d9373;          /* Primary teal-green */
--accent-orange: #e07832;
--accent-red: #dc3545;
--accent-blue: #3b82f6;

/* Encryption colors */
--enc-wpa3: #0d9373;  /* green */
--enc-wpa2: #3b82f6;  /* blue */
--enc-wpa: #e07832;   /* orange */
--enc-wep: #dc3545;   /* red */
--enc-open: #9ca3af;  /* gray */
```

### RPG Visual System

#### Profile Hero
- Dark gradient background (#0a1628 -> #1a1a2e) with radial glow accents
- SVG level ring with animated progress arc
- Animated XP bar with shimmer effect
- Rank title with text-shadow glow

#### Badge Tiers (visual rarity)
| Tier | Color | Effect |
|------|-------|--------|
| 1 | Gray border | None |
| 2 | Green border | None |
| 3 | Blue border | Subtle shadow |
| 4 | Purple border | Background tint + shadow |
| 5 | Gold border | Pulsing gold glow animation |
| 6-8 | Red/purple gradient | Pulsing legendary glow animation |

Locked badges: 35% opacity, grayscale filter, reduced on hover.

#### Leaderboard
- Top 3: gold/silver/bronze left border + gradient background + avatar glow
- Medal icons for ranks 1-3
- Rank title shown under username
- Clickable rows -> navigate to player profile

### Animations

```css
/* XP bar shimmer */
@keyframes xp-shimmer { 0%,100% { opacity:0 } 50% { opacity:1 } }

/* Gold badge glow */
@keyframes badge-glow-gold { 0%,100% { box-shadow: 0 0 6px gold/8% } 50% { box-shadow: 0 0 14px gold/20% } }

/* Legendary badge glow */
@keyframes badge-glow-legendary { 0%,100% { box-shadow: 0 0 8px red/8% } 50% { box-shadow: 0 0 18px red/20%, 0 0 30px purple/10% } }

/* Upload status pulse */
@keyframes pulse-dot { 0%,100% { opacity:0.35; scale:0.9 } 50% { opacity:1; scale:1.15 } }
```

## Map Features

### Layers
- **WiFi**: CircleMarkers with encryption color-coding, MarkerCluster at zoom <17
- **Bluetooth**: Purple markers
- **Cell towers**: Blue markers
- **Heatmap**: Signal strength gradient (toggle)

### Controls
- View mode: Markers / Heatmap
- Layer toggles: WiFi / BT / Cell
- "Mine only" filter (authenticated)
- Search: SSID or BSSID
- Encryption <input type="checkbox">: Filter by type

### Interactions
- Viewport-based data loading (fetch GeoJSON by bounding box)
- Live refresh every 5 seconds
- Multi-AP popup navigation (arrows when overlapping)
- Click marker -> popup with network details + Google Maps link

## Sidebar (map page only)

1. **Profile card**: username, rank, XP progress bar (animated fill)
2. **Access Points**: total count
3. **Encryption chart**: Chart.js doughnut
4. **Top SSID**: ranked list
5. **Sessions**: upload count + mini bar chart
6. **Filters**: encryption checkboxes + SSID search

## Upload Modal

- Drag & drop zone + browse button
- Accepted: `.csv`, `.wigle.csv`, `.netxml`, `.xml`, `.kml`, `.kmz`, `.ns1`, `.db`, `.plist`, `.txt`, `.wiscan`
- Progress bar (30% -> 50% -> 100%)
- Result display: imported / updated / skipped / XP earned
- Auto-refresh map + stats after upload
- Toast notifications (success/error)

## Responsive

- `<768px`: hamburger menu, sidebar as overlay, full-width map
- `<390px`: reduced font sizes, tighter spacing
- RPG grids: 4 columns -> 2 columns on mobile
- Badge grid: auto-fill with min 110px

## API Integration

All requests to `/api/v1/`:
- `authFetch()` adds JWT Bearer token, auto-refreshes 30s before expiry
- Upload: multipart POST, polls status every 1s (180 max attempts)
- Map: GeoJSON endpoints with bbox + filter params
- Stats: cached (5min TTL server-side)
- Profile: public endpoints for user lookup (by ID or username)
