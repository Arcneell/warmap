"""Monthly stats rollup cron job."""

from datetime import date

from arq.cron import cron
from sqlalchemy import func, select

from app.database import async_session
from app.models.network import BtNetwork, CellTower, WifiNetwork
from app.models.stats import MonthlyStats
from app.models.user import User


async def _run_monthly_rollup(ctx: dict):
    """Snapshot each user's discoveries for the current month."""
    current_month = date.today().replace(day=1)

    async with async_session() as db:
        # Get all users
        result = await db.execute(select(User).where(User.is_active == True))  # noqa: E712
        users = result.scalars().all()

        for user in users:
            wifi_count = await db.scalar(
                select(func.count(WifiNetwork.id)).where(
                    WifiNetwork.discovered_by == user.id
                )
            ) or 0

            bt_count = await db.scalar(
                select(func.count(BtNetwork.id)).where(
                    BtNetwork.discovered_by == user.id
                )
            ) or 0

            cell_count = await db.scalar(
                select(func.count(CellTower.id)).where(
                    CellTower.discovered_by == user.id
                )
            ) or 0

            # Upsert monthly stats
            existing = await db.execute(
                select(MonthlyStats).where(
                    MonthlyStats.user_id == user.id,
                    MonthlyStats.month == current_month,
                )
            )
            stats = existing.scalar_one_or_none()

            if stats:
                stats.wifi_discovered = wifi_count
                stats.bt_discovered = bt_count
                stats.cell_discovered = cell_count
                stats.xp_earned = user.xp
            else:
                stats = MonthlyStats(
                    user_id=user.id,
                    month=current_month,
                    wifi_discovered=wifi_count,
                    bt_discovered=bt_count,
                    cell_discovered=cell_count,
                    xp_earned=user.xp,
                )
                db.add(stats)

        await db.commit()


# Run at midnight on the 1st of each month
monthly_stats_rollup = cron(
    _run_monthly_rollup,
    month=None,  # every month
    day=1,
    hour=0,
    minute=0,
)
