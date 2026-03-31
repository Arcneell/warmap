"""Upload processing task for ARQ worker.

Pipeline:
  1. Fetch file from Redis
  2. Parse (detect format, extract observations)
  3. Dedup + store observations + trilaterate
  4. Update stats, XP, badges
  5. Publish final status via Redis pub/sub
"""

import json
from datetime import datetime, timezone

from redis.asyncio import Redis
from sqlalchemy import select

from app.config import get_settings
from app.database import async_session
from app.models.transaction import UploadTransaction
from app.models.user import User
from app.parsers.registry import parse_file
from app.services.upload import process_observations

settings = get_settings()


async def _get_redis_clients() -> tuple[Redis, Redis]:
    """Get both text and binary Redis clients."""
    text = Redis.from_url(settings.redis_url, decode_responses=True)
    binary = Redis.from_url(settings.redis_url, decode_responses=False)
    return text, binary


async def _publish_status(redis_text: Redis, transaction_id: int, status: str, message: str = "", **extra):
    """Publish a status update to the transaction's pub/sub channel."""
    data = {"status": status, "message": message, **extra}
    await redis_text.publish(
        f"upload:{transaction_id}:status",
        json.dumps(data),
    )


async def process_upload_task(ctx: dict, transaction_id: int, filename: str):
    """Process an uploaded file asynchronously.

    Called by ARQ worker. File content is stored in Redis under
    'upload:{transaction_id}:file'.
    """
    redis_text, redis_bin = await _get_redis_clients()

    try:
        # Fetch file from Redis
        file_key = f"upload:{transaction_id}:file"
        file_content = await redis_bin.get(file_key)

        if file_content is None:
            async with async_session() as db:
                result = await db.execute(
                    select(UploadTransaction).where(UploadTransaction.id == transaction_id)
                )
                transaction = result.scalar_one_or_none()
                if transaction:
                    transaction.status = "error"
                    transaction.status_message = "File content not found in Redis (expired?)"
                    transaction.completed_at = datetime.now(timezone.utc)
                    await db.commit()
            await _publish_status(redis_text, transaction_id, "error", "File content expired")
            return

        async with async_session() as db:
            # Fetch transaction
            result = await db.execute(
                select(UploadTransaction).where(UploadTransaction.id == transaction_id)
            )
            transaction = result.scalar_one_or_none()
            if not transaction:
                return

            # Fetch user
            user_result = await db.execute(
                select(User).where(User.id == transaction.user_id)
            )
            user = user_result.scalar_one_or_none()
            if not user:
                transaction.status = "error"
                transaction.status_message = "User not found"
                transaction.completed_at = datetime.now(timezone.utc)
                await db.commit()
                await _publish_status(redis_text, transaction_id, "error", "User not found")
                return

            try:
                # --- Stage 1: Parse ---
                transaction.status = "parsing"
                await db.commit()
                await _publish_status(redis_text, transaction_id, "parsing", f"Parsing {filename}...")

                format_id, observations = parse_file(filename, file_content)
                transaction.file_format = format_id

                if not observations:
                    transaction.status = "done"
                    transaction.status_message = "No valid observations found"
                    transaction.completed_at = datetime.now(timezone.utc)
                    await db.commit()
                    await _publish_status(
                        redis_text, transaction_id, "done",
                        "No valid observations found",
                        wifi_count=0, bt_count=0, ble_count=0, cell_count=0,
                        new_networks=0, xp_earned=0,
                    )
                    return

                await _publish_status(
                    redis_text, transaction_id, "parsing",
                    f"Found {len(observations)} observations",
                )

                # --- Stage 2: Dedup + Trilaterate ---
                transaction.status = "trilaterating"
                await db.commit()
                await _publish_status(
                    redis_text, transaction_id, "trilaterating",
                    f"Processing {len(observations)} observations...",
                )

                await process_observations(db, transaction, observations, user)

                # --- Stage 3: Done (stats + XP updated in process_observations) ---
                await _publish_status(
                    redis_text, transaction_id, "done",
                    f"Complete: {transaction.new_networks} new, "
                    f"{transaction.updated_networks} updated, "
                    f"{transaction.skipped_networks} skipped",
                    wifi_count=transaction.wifi_count,
                    bt_count=transaction.bt_count,
                    ble_count=transaction.ble_count,
                    cell_count=transaction.cell_count,
                    new_networks=transaction.new_networks,
                    updated_networks=transaction.updated_networks,
                    skipped_networks=transaction.skipped_networks,
                    xp_earned=transaction.xp_earned,
                )

            except Exception as e:
                transaction.status = "error"
                transaction.status_message = str(e)[:500]
                transaction.completed_at = datetime.now(timezone.utc)
                await db.commit()
                await _publish_status(redis_text, transaction_id, "error", str(e)[:200])
                raise

        # Clean up file from Redis after successful processing
        await redis_bin.delete(file_key)

    finally:
        await redis_text.close()
        await redis_bin.close()
