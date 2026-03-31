import asyncio
import json
from datetime import datetime, timezone

from arq.connections import ArqRedis, create_pool
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.middleware.auth import get_current_user
from app.middleware.rate_limit import get_redis, get_redis_binary
from app.models.transaction import UploadTransaction
from app.models.user import User
from app.schemas.upload import TransactionStatus, UploadHistoryItem, UploadResponse
from app.tasks.worker import parse_redis_url

settings = get_settings()
router = APIRouter(prefix="/upload", tags=["upload"])
FORBIDDEN_ARCHIVE_EXTENSIONS = (".zip", ".gz", ".tgz", ".tar.gz")

_arq_pool: ArqRedis | None = None


async def _get_arq_pool() -> ArqRedis:
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_pool(parse_redis_url(settings.redis_url))
    return _arq_pool


@router.post("", response_model=list[UploadResponse])
async def upload_files(
    files: list[UploadFile] = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload wardriving file(s) for async processing.

    Files are stored in Redis and processing is queued via ARQ.
    Returns immediately with transaction IDs for status polling.
    """
    redis_bin = await get_redis_binary()
    arq = await _get_arq_pool()
    responses = []

    for file in files:
        lower_name = (file.filename or "").lower()
        if any(lower_name.endswith(ext) for ext in FORBIDDEN_ARCHIVE_EXTENSIONS):
            raise HTTPException(
                status_code=400,
                detail=f"Archive uploads are disabled for security reasons: {file.filename}",
            )

        content = await file.read()

        # Size check
        if len(content) > settings.upload_max_size_mb * 1024 * 1024:
            raise HTTPException(
                status_code=413,
                detail=f"File {file.filename} exceeds {settings.upload_max_size_mb}MB limit",
            )

        # Create transaction record
        transaction = UploadTransaction(
            user_id=user.id,
            filename=file.filename or "unknown",
            file_size=len(content),
            status="pending",
        )
        db.add(transaction)
        await db.flush()

        # Store file content in Redis (TTL 1 hour)
        file_key = f"upload:{transaction.id}:file"
        await redis_bin.setex(file_key, 3600, content)

        # Publish status update
        redis_text = await get_redis()
        await redis_text.publish(
            f"upload:{transaction.id}:status",
            json.dumps({"status": "pending", "message": "Queued for processing"}),
        )

        # Enqueue ARQ job
        await arq.enqueue_job(
            "process_upload_task",
            transaction.id,
            file.filename or "unknown",
            _job_id=f"upload-{transaction.id}",
        )

        responses.append(
            UploadResponse(transaction_id=transaction.id, status="pending")
        )

    await db.commit()
    return responses


@router.get("/status/{transaction_id}", response_model=TransactionStatus)
async def get_transaction_status(
    transaction_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get status of an upload transaction."""
    result = await db.execute(
        select(UploadTransaction).where(
            UploadTransaction.id == transaction_id,
            UploadTransaction.user_id == user.id,
        )
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.get("/status/{transaction_id}/stream")
async def stream_transaction_status(
    transaction_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SSE endpoint for real-time upload status updates.

    Subscribes to Redis pub/sub channel for this transaction.
    Stream ends when status is 'done' or 'error', or after timeout.
    """
    # Verify ownership
    result = await db.execute(
        select(UploadTransaction).where(
            UploadTransaction.id == transaction_id,
            UploadTransaction.user_id == user.id,
        )
    )
    transaction = result.scalar_one_or_none()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # If already completed, return final status immediately
    if transaction.status in ("done", "error"):
        async def single_event():
            data = json.dumps({
                "status": transaction.status,
                "message": transaction.status_message or "Complete",
                "wifi_count": transaction.wifi_count,
                "bt_count": transaction.bt_count,
                "ble_count": transaction.ble_count,
                "cell_count": transaction.cell_count,
                "new_networks": transaction.new_networks,
                "xp_earned": transaction.xp_earned,
            })
            yield f"data: {data}\n\n"

        return StreamingResponse(single_event(), media_type="text/event-stream")

    async def event_generator():
        redis = await get_redis()
        pubsub = redis.pubsub()
        channel = f"upload:{transaction_id}:status"
        await pubsub.subscribe(channel)

        try:
            # Send current status first
            yield f"data: {json.dumps({'status': transaction.status, 'message': 'Connected'})}\n\n"

            timeout = 300  # 5 minutes max
            start = asyncio.get_event_loop().time()

            while (asyncio.get_event_loop().time() - start) < timeout:
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True, timeout=1.0
                )
                if message and message["type"] == "message":
                    data = message["data"]
                    if isinstance(data, bytes):
                        data = data.decode()
                    yield f"data: {data}\n\n"

                    # Check if terminal status
                    try:
                        parsed = json.loads(data)
                        if parsed.get("status") in ("done", "error"):
                            break
                    except json.JSONDecodeError:
                        pass

            yield f"data: {json.dumps({'status': 'timeout', 'message': 'Stream timed out'})}\n\n"
        finally:
            await pubsub.unsubscribe(channel)
            await pubsub.close()

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("", response_model=list[UploadHistoryItem])
async def upload_history(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
):
    """Get user's upload history."""
    result = await db.execute(
        select(UploadTransaction)
        .where(UploadTransaction.user_id == user.id)
        .order_by(UploadTransaction.uploaded_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()
