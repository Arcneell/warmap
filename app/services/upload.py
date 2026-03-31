from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.network import BtNetwork, CellTower, WifiNetwork
from app.models.observation import WifiObservation
from app.models.transaction import UploadTransaction
from app.models.user import User
from app.parsers.base import NetworkObservation
from app.services.trilateration import Observation, trilaterate
from app.services.xp import XP_PER_IMPORT, XP_PER_SESSION

# Process in batches to limit memory and commit periodically
BATCH_SIZE = 500


async def process_observations(
    db: AsyncSession,
    transaction: UploadTransaction,
    observations: list[NetworkObservation],
    user: User,
) -> None:
    """Process parsed observations: dedup, insert/update, trilaterate.

    Processes in batches of BATCH_SIZE to manage memory for large files.
    """
    wifi_count = 0
    bt_count = 0
    ble_count = 0
    cell_count = 0
    new_count = 0
    updated_count = 0
    skipped_count = 0
    gps_points = 0

    # Track networks that got new observations for retrilateration
    networks_to_retrilaterate: set[int] = set()

    for i, obs in enumerate(observations):
        if obs.latitude and obs.longitude:
            gps_points += 1

        seen_at = _normalize_seen_at(obs.seen_at)
        obs.seen_at = seen_at

        if obs.network_type == "wifi":
            wifi_count += 1
            result, network_id = await _process_wifi(db, obs, transaction, user)
            if network_id and result in ("updated", "skipped"):
                networks_to_retrilaterate.add(network_id)
        elif obs.network_type in ("bt", "ble"):
            if obs.network_type == "ble":
                ble_count += 1
            else:
                bt_count += 1
            result, _ = await _process_bt(db, obs, user)
        elif obs.network_type == "cell":
            cell_count += 1
            result, _ = await _process_cell(db, obs, user)
        else:
            skipped_count += 1
            continue

        if result == "new":
            new_count += 1
        elif result == "updated":
            updated_count += 1
        else:
            skipped_count += 1

        # Batch flush every BATCH_SIZE to release memory
        if (i + 1) % BATCH_SIZE == 0:
            await db.flush()

    await db.flush()

    # --- Retrilaterate networks that received new observations ---
    if networks_to_retrilaterate:
        await _retrilaterate_networks(db, networks_to_retrilaterate)

    # Calculate XP (new WiFi networks only)
    xp_earned = (new_count * XP_PER_IMPORT) + XP_PER_SESSION

    # Update transaction
    transaction.wifi_count = wifi_count
    transaction.bt_count = bt_count
    transaction.ble_count = ble_count
    transaction.cell_count = cell_count
    transaction.gps_points = gps_points
    transaction.new_networks = new_count
    transaction.updated_networks = updated_count
    transaction.skipped_networks = skipped_count
    transaction.xp_earned = xp_earned
    transaction.status = "done"
    transaction.completed_at = datetime.now(timezone.utc)

    # Update user XP
    user.xp += xp_earned

    await db.commit()

    # Post-upload tasks (non-blocking, best-effort)
    try:
        from app.services.badges import evaluate_badges
        await evaluate_badges(db, user)
    except Exception:
        pass

    try:
        from app.services.stats_cache import invalidate_stats
        await invalidate_stats()  # Invalidate all cached stats
    except Exception:
        pass


async def _retrilaterate_networks(
    db: AsyncSession, network_ids: set[int]
) -> None:
    """Recalculate positions for networks using all stored observations.

    Uses weighted centroid (RSSI^2) across all observations -- the WiGLE approach.
    Only updates if there are enough observations to improve accuracy.
    """
    for network_id in network_ids:
        result = await db.execute(
            select(WifiObservation).where(
                WifiObservation.network_id == network_id,
                WifiObservation.latitude.isnot(None),
                WifiObservation.longitude.isnot(None),
                WifiObservation.rssi.isnot(None),
            )
        )
        obs_rows = result.scalars().all()

        if len(obs_rows) < 2:
            continue  # Not enough data to improve over single observation

        observations = [
            Observation(
                latitude=o.latitude,
                longitude=o.longitude,
                rssi=o.rssi,
            )
            for o in obs_rows
            if o.latitude and o.longitude and o.rssi
        ]

        if not observations:
            continue

        new_lat, new_lon = trilaterate(observations)

        # Update network position
        net_result = await db.execute(
            select(WifiNetwork).where(WifiNetwork.id == network_id)
        )
        network = net_result.scalar_one_or_none()
        if network:
            network.latitude = new_lat
            network.longitude = new_lon


async def _process_wifi(
    db: AsyncSession,
    obs: NetworkObservation,
    transaction: UploadTransaction,
    user: User,
) -> tuple[str, int | None]:
    """Returns (result_type, network_id)."""
    result = await db.execute(
        select(WifiNetwork).where(WifiNetwork.bssid == obs.identifier)
    )
    network = result.scalar_one_or_none()

    seen_at = obs.seen_at or datetime.now(timezone.utc)

    if network is None:
        network = WifiNetwork(
            bssid=obs.identifier,
            ssid=obs.name or "",
            encryption=obs.encryption or "Unknown",
            channel=obs.channel or 0,
            frequency=obs.frequency or 0,
            rssi=obs.rssi or -100,
            latitude=obs.latitude,
            longitude=obs.longitude,
            altitude=obs.altitude,
            accuracy=obs.accuracy,
            first_seen=seen_at,
            last_seen=seen_at,
            discovered_by=user.id,
            last_updated_by=user.id,
        )
        db.add(network)
        await db.flush()

        # Store observation
        observation = WifiObservation(
            network_id=network.id,
            transaction_id=transaction.id,
            user_id=user.id,
            rssi=obs.rssi,
            latitude=obs.latitude,
            longitude=obs.longitude,
            altitude=obs.altitude,
            accuracy=obs.accuracy,
            seen_at=seen_at,
        )
        db.add(observation)
        return "new", network.id

    # Existing network - update metadata if better data
    changed = False

    if obs.rssi and obs.rssi > network.rssi:
        network.rssi = obs.rssi
        changed = True

    if seen_at > network.last_seen:
        network.last_seen = seen_at
        changed = True

    if not network.ssid and obs.name:
        network.ssid = obs.name
        changed = True

    if network.encryption == "Unknown" and obs.encryption and obs.encryption != "Unknown":
        network.encryption = obs.encryption
        changed = True

    network.seen_count += 1
    network.last_updated_by = user.id

    # Always store observation for trilateration
    observation = WifiObservation(
        network_id=network.id,
        transaction_id=transaction.id,
        user_id=user.id,
        rssi=obs.rssi,
        latitude=obs.latitude,
        longitude=obs.longitude,
        altitude=obs.altitude,
        accuracy=obs.accuracy,
        seen_at=seen_at,
    )
    db.add(observation)

    return ("updated" if changed else "skipped"), network.id


async def _process_bt(
    db: AsyncSession,
    obs: NetworkObservation,
    user: User,
) -> tuple[str, int | None]:
    result = await db.execute(
        select(BtNetwork).where(BtNetwork.mac == obs.identifier)
    )
    network = result.scalar_one_or_none()
    seen_at = obs.seen_at or datetime.now(timezone.utc)

    if network is None:
        network = BtNetwork(
            mac=obs.identifier,
            name=obs.name or "",
            device_type=obs.network_type.upper(),
            rssi=obs.rssi or -100,
            latitude=obs.latitude,
            longitude=obs.longitude,
            first_seen=seen_at,
            last_seen=seen_at,
            discovered_by=user.id,
        )
        db.add(network)
        return "new", network.id

    changed = False
    if obs.rssi and obs.rssi > network.rssi:
        network.rssi = obs.rssi
        if obs.latitude and obs.longitude:
            network.latitude = obs.latitude
            network.longitude = obs.longitude
        changed = True

    if seen_at > network.last_seen:
        network.last_seen = seen_at
        changed = True

    if not network.name and obs.name:
        network.name = obs.name
        changed = True

    network.seen_count += 1
    return ("updated" if changed else "skipped"), network.id


async def _process_cell(
    db: AsyncSession,
    obs: NetworkObservation,
    user: User,
) -> tuple[str, int | None]:
    if not obs.radio or obs.mcc is None or obs.mnc is None or obs.cid is None:
        return "skipped", None

    result = await db.execute(
        select(CellTower).where(
            CellTower.radio == obs.radio,
            CellTower.mcc == obs.mcc,
            CellTower.mnc == obs.mnc,
            CellTower.lac == obs.lac,
            CellTower.cid == obs.cid,
        )
    )
    tower = result.scalar_one_or_none()
    seen_at = obs.seen_at or datetime.now(timezone.utc)

    if tower is None:
        tower = CellTower(
            radio=obs.radio,
            mcc=obs.mcc,
            mnc=obs.mnc,
            lac=obs.lac,
            cid=obs.cid,
            rssi=obs.rssi or -100,
            latitude=obs.latitude,
            longitude=obs.longitude,
            first_seen=seen_at,
            last_seen=seen_at,
            discovered_by=user.id,
        )
        db.add(tower)
        return "new", tower.id

    changed = False
    if obs.rssi and obs.rssi > tower.rssi:
        tower.rssi = obs.rssi
        if obs.latitude and obs.longitude:
            tower.latitude = obs.latitude
            tower.longitude = obs.longitude
        changed = True

    if seen_at > tower.last_seen:
        tower.last_seen = seen_at
        changed = True

    tower.seen_count += 1
    return ("updated" if changed else "skipped"), tower.id


def _normalize_seen_at(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
