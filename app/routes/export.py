from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.export import export_geojson, export_wigle_csv
from app.services.kml_export import export_kml

import io

router = APIRouter(prefix="/export", tags=["export"])


@router.get("/wigle-csv")
async def download_wigle_csv(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    mine_only: bool = Query(False),
):
    """Export data as WiGLE CSV."""
    user_id = user.id if mine_only else None
    csv_content = await export_wigle_csv(db, user_id=user_id)
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=wardrove_export.wigle.csv"},
    )


@router.get("/kml")
async def download_kml(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    mine_only: bool = Query(False),
):
    """Export all WiFi networks as KML."""
    user_id = user.id if mine_only else None
    kml_content = await export_kml(db, user_id=user_id)
    return Response(
        content=kml_content,
        media_type="application/vnd.google-earth.kml+xml",
        headers={"Content-Disposition": "attachment; filename=wardrove_export.kml"},
    )


@router.get("/kml/{transaction_id}")
async def download_kml_transaction(
    transaction_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Export a specific upload transaction as KML."""
    kml_content = await export_kml(db, transaction_id=transaction_id)
    return Response(
        content=kml_content,
        media_type="application/vnd.google-earth.kml+xml",
        headers={"Content-Disposition": f"attachment; filename=wardrove_upload_{transaction_id}.kml"},
    )


@router.get("/geojson")
async def download_geojson(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    lat_min: float | None = Query(None),
    lat_max: float | None = Query(None),
    lon_min: float | None = Query(None),
    lon_max: float | None = Query(None),
    encryption: str | None = Query(None),
    ssid: str | None = Query(None),
):
    """Export data as GeoJSON."""
    return await export_geojson(
        db,
        lat_min=lat_min, lat_max=lat_max,
        lon_min=lon_min, lon_max=lon_max,
        encryption=encryption, ssid=ssid,
    )
