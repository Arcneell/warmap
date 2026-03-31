from fastapi import APIRouter, HTTPException, Query

from app.services.geocoding import reverse_geocode

router = APIRouter(prefix="/geocode", tags=["geocode"])


@router.get("/reverse")
async def reverse(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    """Reverse geocode coordinates to address (Nominatim, cached 7 days)."""
    result = await reverse_geocode(lat, lon)
    if result is None:
        raise HTTPException(status_code=502, detail="Geocoding service unavailable")
    return result
