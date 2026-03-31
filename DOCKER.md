# Docker & Deployment

## docker-compose.yml

4 services:

| Service | Image | Purpose |
|---------|-------|---------|
| `app` | Custom (Dockerfile) | FastAPI + static files, port 8847 |
| `worker` | Same image | ARQ worker (2 replicas) |
| `postgres` | postgis/postgis:16-3.4 | Database |
| `redis` | redis:7-alpine | Cache + queue + file storage |

```yaml
services:
  app:
    build: .
    ports: ["8847:8000"]
    depends_on: [postgres, redis]

  worker:
    build: .
    command: ["python", "-m", "arq", "app.tasks.worker.WorkerSettings"]
    deploy:
      replicas: 2
    environment:
      - WORKER_MAX_JOBS=10
    depends_on: [postgres, redis]

  postgres:
    image: postgis/postgis:16-3.4
    volumes: [pgdata:/var/lib/postgresql/data]

  redis:
    image: redis:7-alpine
    volumes: [redisdata:/data]
```

## Environment Variables

All services share these via `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_PASSWORD` | `wardrove` | PostgreSQL password |
| `SECRET_KEY` | `change-me-in-production` | JWT signing key |
| `APP_URL` | `http://localhost:8847` | Public URL (for OAuth callbacks) |
| `GITHUB_CLIENT_ID` | -- | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | -- | GitHub OAuth secret |
| `WORKER_MAX_JOBS` | `10` | Concurrent jobs per worker |
| `TZ` | `Indian/Reunion` | Timezone |

## Volumes

- `pgdata`: PostgreSQL data (persistent)
- `redisdata`: Redis AOF (persistent queue/cache)

## Health Checks

- PostgreSQL: `pg_isready -U wardrove` (5s interval, 3 retries)
- Redis: `redis-cli ping` (5s interval, 3 retries)
- Worker: ARQ built-in health check (30s interval)

## Database Initialization

On first start, `app/main.py` lifespan:
1. `Base.metadata.create_all()` creates all tables
2. `seed_badges()` inserts/updates 42 badge definitions
3. Ready to accept uploads

No manual migration needed. Schema changes via SQLAlchemy `create_all` (additive only).

## Resource Tuning

### Database Pool
- `pool_size=30`, `max_overflow=20` (50 max connections)
- Sized for 2 workers x 10 jobs + app requests

### Worker Scaling
- Default: 2 replicas, 10 concurrent jobs each = 20 parallel uploads
- Scale with: `docker compose up -d --scale worker=4`
- Each worker needs ~100MB RAM + DB connections

### Redis
- File TTL: 4 hours (large files may process slowly)
- Stats cache TTL: 5 minutes
- Max upload size: 100MB (configurable via `UPLOAD_MAX_SIZE_MB`)

## CLI Upload Examples

```bash
# Upload with API token
curl -X POST http://localhost:8847/api/v1/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@capture.wigle.csv"

# Upload multiple files
curl -X POST http://localhost:8847/api/v1/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@scan1.wigle.csv" \
  -F "files=@scan2.wigle.csv"

# Check processing status
curl http://localhost:8847/api/v1/upload/status/42

# Queue health
curl http://localhost:8847/api/v1/queue/health

# Export all data
curl http://localhost:8847/api/v1/export/geojson > all_networks.geojson
```

## Logs

```bash
# All services
docker compose logs -f

# Worker only
docker compose logs -f worker

# App only
docker compose logs -f app
```
