"""Queue monitoring endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.rate_limit import get_redis
from app.models.transaction import UploadTransaction

router = APIRouter(prefix="/queue", tags=["queue"])


@router.get("/status")
async def queue_status(db: AsyncSession = Depends(get_db)):
    """Get current processing queue status.

    Shows counts of transactions in each status.
    """
    result = await db.execute(
        select(UploadTransaction.status, func.count(UploadTransaction.id))
        .group_by(UploadTransaction.status)
    )
    status_counts = {row[0]: row[1] for row in result.all()}

    return {
        "pending": status_counts.get("pending", 0),
        "parsing": status_counts.get("parsing", 0),
        "trilaterating": status_counts.get("trilaterating", 0),
        "indexing": status_counts.get("indexing", 0),
        "done": status_counts.get("done", 0),
        "error": status_counts.get("error", 0),
        "total_in_queue": sum(
            status_counts.get(s, 0)
            for s in ("pending", "parsing", "trilaterating", "indexing")
        ),
    }


@router.get("/health")
async def queue_health():
    """Check if the queue system (Redis) is healthy."""
    try:
        redis = await get_redis()
        await redis.ping()
        return {"status": "healthy", "redis": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "redis": str(e)}
