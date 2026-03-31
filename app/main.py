import asyncio
import errno
import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.exc import OperationalError

from app.config import get_settings
from app.database import init_db
from app.routes import auth, upload, networks, stats, profile, groups, export, queue, geocode

STATIC_DIR = Path(__file__).parent / "static"

logger = logging.getLogger(__name__)

# PostGIS/Postgres Docker image restarts once after first-time init; pg_isready can go
# healthy during the brief window before that restart, so the API must retry instead of exit.
_DB_BOOTSTRAP_DEADLINE_SEC = 120.0
_DB_BOOTSTRAP_RETRY_SEC = 2.0


def _is_transient_db_connect_error(exc: BaseException) -> bool:
    if isinstance(exc, ConnectionRefusedError):
        return True
    if isinstance(exc, TimeoutError):
        return True
    if isinstance(exc, OSError) and getattr(exc, "errno", None) in (
        errno.ECONNREFUSED,
        errno.ETIMEDOUT,
        errno.EHOSTUNREACH,
    ):
        return True
    if isinstance(exc, OperationalError):
        orig = getattr(exc, "orig", None)
        return _is_transient_db_connect_error(orig) if orig is not None else False
    return False


async def _bootstrap_database() -> None:
    from app.database import async_session
    from app.services.badges import seed_badges

    deadline = time.monotonic() + _DB_BOOTSTRAP_DEADLINE_SEC
    attempt = 0
    last_err: BaseException | None = None

    while True:
        attempt += 1
        try:
            await init_db()
            async with async_session() as db:
                await seed_badges(db)
            if attempt > 1:
                logger.info("Database ready after %s attempt(s)", attempt)
            return
        except Exception as e:
            last_err = e
            if not _is_transient_db_connect_error(e):
                raise
            if time.monotonic() >= deadline:
                logger.error(
                    "Database still unreachable after %.0fs (last error: %s)",
                    _DB_BOOTSTRAP_DEADLINE_SEC,
                    last_err,
                )
                raise RuntimeError(
                    f"Database not reachable after {_DB_BOOTSTRAP_DEADLINE_SEC:.0f}s; "
                    "is Postgres up? Check `docker compose logs postgres`."
                ) from last_err
            logger.warning(
                "Database not ready (attempt %s): %s — retrying in %ss",
                attempt,
                last_err,
                _DB_BOOTSTRAP_RETRY_SEC,
            )
            await asyncio.sleep(_DB_BOOTSTRAP_RETRY_SEC)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await _bootstrap_database()
    yield
    # Cleanup
    from app.middleware.rate_limit import close_redis
    await close_redis()
    from app.database import engine
    await engine.dispose()


app = FastAPI(title="Wardrove", version="3.0.0", lifespan=lifespan)

# CORS — restrict to configured app URL in production
_settings = get_settings()
_cors_origins = [_settings.app_url]
if _settings.app_url.startswith("http://localhost"):
    _cors_origins.extend(["http://localhost:3000", "http://localhost:8847"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 routes
app.include_router(auth.router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")
app.include_router(networks.router, prefix="/api/v1")
app.include_router(stats.router, prefix="/api/v1")
app.include_router(profile.router, prefix="/api/v1")
app.include_router(groups.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")
app.include_router(queue.router, prefix="/api/v1")
app.include_router(geocode.router, prefix="/api/v1")

# Static files (Vite build output)
app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    file_path = STATIC_DIR / full_path
    if full_path and file_path.is_file():
        return FileResponse(file_path)
    return FileResponse(STATIC_DIR / "index.html")
