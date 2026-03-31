# Backend Specifications

## Database (PostgreSQL 16 + PostGIS)

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | Player accounts | id, username, email, avatar_url, xp, oauth_provider, oauth_id, is_admin, is_active, created_at |
| `api_tokens` | Programmatic access | id, user_id, token_hash, name, expires_at, revoked, created_at |
| `wifi_networks` | WiFi access points | id, bssid (unique), ssid, encryption, channel, frequency, rssi, lat, lon, discovered_by, first_seen, last_seen, seen_count |
| `wifi_observations` | Per-scan observations | id, network_id, transaction_id, user_id, rssi, lat, lon, seen_at |
| `bt_networks` | Bluetooth devices | id, mac (unique), name, device_type (BT/BLE), rssi, lat, lon, discovered_by |
| `cell_towers` | Cell towers | id, radio, mcc, mnc, lac, cid (composite unique), rssi, lat, lon, discovered_by |
| `upload_transactions` | Job tracking | id, user_id, filename, file_size, status, wifi/bt/cell counts, xp_earned, timestamps |
| `badge_definitions` | Badge catalog (61 badges) | id, slug, name, description, icon_svg, category, tier, criteria_type, criteria_value |
| `user_badges` | Earned badges | user_id, badge_id, earned_at |
| `groups` | Guilds/teams | id, name, description, created_by |
| `group_members` | Guild membership | group_id, user_id, role (admin/member) |
| `monthly_stats` | Aggregated stats | id, user_id, month, wifi/bt/cell discovered, xp_earned, rank |

## API Endpoints (all under `/api/v1`)

### Auth (`/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/login/{provider}` | No | Returns OAuth redirect URL |
| GET | `/callback/{provider}` | No | OAuth callback → sets refresh cookie → redirects with auth_code |
| POST | `/exchange` | No | Exchange one-time auth_code for access token |
| POST | `/refresh` | Cookie | Refresh access token |
| POST | `/logout` | No | Clear refresh cookie |
| GET | `/me` | JWT | Current user info with level/rank |
| GET | `/tokens` | JWT | List API tokens |
| POST | `/tokens` | JWT | Create API token (returns raw token once) |
| DELETE | `/tokens/{id}` | JWT | Revoke token |

### Upload (`/upload`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | JWT | Upload files → Redis → ARQ queue |
| GET | `/` | JWT | Upload history with queue positions |
| GET | `/status/{id}` | JWT | Transaction status (ownership verified) |
| GET | `/status/{id}/stream` | JWT | SSE real-time status updates |

### Networks (`/networks`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/wifi` | Optional | List WiFi networks (cursor pagination) |
| GET | `/wifi/geojson` | Optional | Viewport-based GeoJSON |
| GET | `/wifi/count` | Optional | Count in bounding box |
| GET | `/wifi/{bssid}` | Optional | Single network detail |
| GET | `/bt` | Optional | List BT devices (pagination) |
| GET | `/bt/geojson` | Optional | BT GeoJSON |
| GET | `/cell` | Optional | List cell towers (pagination) |
| GET | `/cell/geojson` | Optional | Cell GeoJSON |

### Stats (`/stats`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | Global totals, encryption distribution, top SSIDs |
| GET | `/leaderboard` | No | Player rankings (sort by xp/wifi) |
| GET | `/channels` | No | WiFi channel distribution |
| GET | `/encryption` | No | Encryption type counts |
| GET | `/manufacturers` | No | Top OUI manufacturers |
| GET | `/countries` | No | Country stats by MCC |
| GET | `/top-ssids` | No | Most common SSIDs |

### Profile (`/profile`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | JWT | My profile with XP progress |
| PUT | `/` | JWT | Update username |
| GET | `/u/{username}` | No | Public profile by username |
| GET | `/{id}` | No | Public profile by ID |
| GET | `/{id}/badges` | No | All badges (earned + unearned) |
| GET | `/{id}/badge.svg` | No | Dynamic SVG badge card |

### Groups (`/groups`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | No | List all groups |
| POST | `/` | JWT | Create group |
| GET | `/{id}` | No | Group detail with members |
| POST | `/{id}/join` | JWT | Join group |
| DELETE | `/{id}/leave` | JWT | Leave group |
| GET | `/{id}/leaderboard` | No | Group rankings |

### Export (`/export`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/wigle-csv` | Optional | WiGLE CSV export (streaming) |
| GET | `/kml` | Optional | KML export |
| GET | `/kml/{id}` | Optional | KML for single upload |
| GET | `/geojson` | Optional | GeoJSON with filters |

## Processing Pipeline

```
POST /upload
  → Validate (size, format, no archives)
  → Store file in Redis (binary, 4h TTL)
  → Create UploadTransaction (status: pending)
  → Enqueue ARQ job (after DB commit)

Worker picks up job:
  → Fetch file from Redis
  → Detect format (extension → content inspection → fallback)
  → Parse observations (thread pool for CPU work)
  → Batch dedup (2000 obs/batch):
      - Bulk pre-fetch BSSIDs
      - New → INSERT network + observation
      - Existing → UPDATE if better (RSSI, last_seen, SSID)
  → Trilaterate (RSSI-weighted centroid)
  → Award XP + evaluate 61 badge criteria
  → Invalidate stats cache
  → Publish status via Redis pub/sub
```

## Security

### Authentication
- GitHub OAuth with CSRF state parameter (Redis, 300s TTL)
- One-time auth codes (Redis, 60s TTL) — not reusable
- JWT access tokens: HS256, 60min expiry
- Refresh tokens: httpOnly, Secure, SameSite=Lax cookies, 30-day expiry
- API tokens: SHA-256 hashed in DB, raw token returned once at creation

### Rate Limiting
- Redis sliding window (sorted set), 1-minute window
- Rate limit key uses SHA-256 hash of token (no token prefix leak)
- Limits: 100/min (JWT auth), 50/min (API token), 20/min (anonymous)

### CORS
- Origins restricted to configured `APP_URL` (+ localhost variants in dev)
- No wildcard origins in production
- Credentials allowed only for configured origins

### Upload Security
- Archive formats (.zip, .gz, .tar.gz) rejected
- File size limit (100MB default, configurable)
- Files stored in Redis with 4h TTL (auto-cleanup)
- Processing in sandboxed worker (separate process)

### Data Validation
- Pydantic schemas for all request/response models
- SQLAlchemy ORM with parameterized queries (no SQL injection)
- User-generated content (SSIDs, device names) HTML-escaped on frontend

## XP & Level System

```python
def xp_for_level(level):
    return level * (level - 1) * (level + 20) * 5

# Examples:
# Level 10  =    4,500 XP
# Level 25  =   54,000 XP
# Level 50  =  343,000 XP
# Level 75  = 1,068,750 XP
# Level 100 = 5,940,000 XP (≈ 5.94M unique WiFi discoveries)
```

## Configuration

All settings via environment variables (`.env` file):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://wardrove:wardrove@localhost:5432/wardrove` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
| `SECRET_KEY` | `change-me-in-production` | JWT signing key |
| `APP_URL` | `http://localhost:8847` | Public app URL (CORS + OAuth) |
| `GITHUB_CLIENT_ID` | — | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | — | GitHub OAuth app client secret |
| `UPLOAD_MAX_SIZE_MB` | `100` | Max upload file size |
| `RATE_LIMIT_AUTH` | `100` | Requests/min for authenticated users |
| `RATE_LIMIT_API_TOKEN` | `50` | Requests/min for API token users |
| `RATE_LIMIT_ANON` | `20` | Requests/min for anonymous users |
| `WORKER_MAX_JOBS` | `10` | Concurrent jobs per worker |
