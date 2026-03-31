from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import init_db
from app.routes import auth, upload, networks, stats, profile, export, queue, geocode

STATIC_DIR = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Seed badge definitions
    from app.database import async_session
    from app.services.badges import seed_badges
    async with async_session() as db:
        await seed_badges(db)
    yield
    # Cleanup
    from app.middleware.rate_limit import close_redis
    await close_redis()
    from app.database import engine
    await engine.dispose()


app = FastAPI(title="Wardrove", version="2.0.0", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
