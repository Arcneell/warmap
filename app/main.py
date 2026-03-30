from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import init_db
from app.routes import upload, accesspoints, stats

STATIC_DIR = Path(__file__).parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Wardrove", lifespan=lifespan)

app.include_router(upload.router, prefix="/api")
app.include_router(accesspoints.router, prefix="/api")
app.include_router(stats.router, prefix="/api")

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/{full_path:path}")
async def serve_spa(full_path: str):
    file_path = STATIC_DIR / full_path
    if full_path and file_path.is_file():
        return FileResponse(file_path)
    return FileResponse(STATIC_DIR / "index.html")
