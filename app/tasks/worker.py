"""ARQ worker configuration and entry point.

Run with: python -m arq app.tasks.worker.WorkerSettings
"""

import logging

from arq.connections import RedisSettings

from app.config import get_settings
from app.tasks.process_upload import process_upload_task
from app.tasks.monthly_rollup import monthly_stats_rollup

settings = get_settings()
logger = logging.getLogger("arq.worker")


def parse_redis_url(url: str) -> RedisSettings:
    """Parse redis:// URL into RedisSettings."""
    from urllib.parse import urlparse
    parsed = urlparse(url)
    return RedisSettings(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        database=int(parsed.path.lstrip("/") or 0),
        password=parsed.password,
    )


async def on_startup(ctx: dict):
    """Called when the worker starts."""
    logger.info("Wardrove ARQ worker starting up")


async def on_shutdown(ctx: dict):
    """Called when the worker shuts down."""
    logger.info("Wardrove ARQ worker shutting down")


class WorkerSettings:
    functions = [process_upload_task]
    cron_jobs = [monthly_stats_rollup]
    on_startup = on_startup
    on_shutdown = on_shutdown
    redis_settings = parse_redis_url(settings.redis_url)
    max_jobs = settings.worker_max_jobs
    job_timeout = 600  # 10 minutes per job
    health_check_interval = 30
    retry_jobs = True
    max_tries = 3
