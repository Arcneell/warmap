from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.network import BtNetwork, CellTower, WifiNetwork
from app.models.observation import WifiObservation
from app.models.transaction import UploadTransaction
from app.models.user import User
from app.parsers.base import NetworkObservation
from app.services.trilateration import Observation, trilaterate
from app.services.xp import XP_PER_IMPORT, XP_PER_SESSION

# Larger batches = fewer round-trips to the DB
BATCH_SIZE = 2000


async def process_observations(
    db: AsyncSession,
    transaction: UploadTransaction,
    observations: list[NetworkObservation],
    user: User,
) -> None:
    """Process parsed observations: dedup, insert/update, trilaterate.

    Optimized with bulk lookups and batch inserts to minimize DB round-trips.
    """
    wifi_count = 0
    bt_count = 0
    ble_count = 0
    cell_count = 0
    new_wifi_count = 0
    new_bt_like_count = 0
    updated_wifi_count = 0
    skipped_count = 0
    gps_points = 0

    # Track networks that got new observations for retrilateration
    networks_to_retrilaterate: set[int] = set()

    # Normalize all timestamps upfront
    for obs in observations:
        obs.seen_at = _normalize_seen_at(obs.seen_at)
        if obs.latitude and obs.longitude:
            gps_points += 1

    # Split observations by type for bulk processing
    wifi_obs = [o for o in observations if o.network_type == "wifi"]
    bt_obs = [o for o in observations if o.network_type in ("bt", "ble")]
    cell_obs = [o for o in observations if o.network_type == "cell"]

    wifi_count = len(wifi_obs)
    bt_count = sum(1 for o in bt_obs if o.network_type == "bt")
    ble_count = sum(1 for o in bt_obs if o.network_type == "ble")
    cell_count = len(cell_obs)

    # --- Process WiFi in bulk batches ---
    for batch_start in range(0, len(wifi_obs), BATCH_SIZE):
        batch = wifi_obs[batch_start:batch_start + BATCH_SIZE]
        new, updated, skipped, retrilat_ids = await _process_wifi_batch(
            db, batch, transaction, user
        )
        new_wifi_count += new
        updated_wifi_count += updated
        skipped_count += skipped
        networks_to_retrilaterate.update(retrilat_ids)
        await db.flush()

    # --- Process BT/BLE in bulk batches ---
    for batch_start in range(0, len(bt_obs), BATCH_SIZE):
        batch = bt_obs[batch_start:batch_start + BATCH_SIZE]
        new, _, skipped, _ = await _process_bt_batch(db, batch, user)
        new_bt_like_count += new
        skipped_count += skipped
        await db.flush()

    # --- Process Cell in bulk batches ---
    for batch_start in range(0, len(cell_obs), BATCH_SIZE):
        batch = cell_obs[batch_start:batch_start + BATCH_SIZE]
        new, _, skipped, _ = await _process_cell_batch(db, batch, user)
        skipped_count += skipped
        await db.flush()

    # --- Retrilaterate networks that received new observations ---
    if networks_to_retrilaterate:
        await _retrilaterate_networks_bulk(db, networks_to_retrilaterate)

    # XP
    xp_earned = XP_PER_SESSION + (new_wifi_count * XP_PER_IMPORT) + (new_bt_like_count // 2)

    # Update transaction
    transaction.wifi_count = wifi_count
    transaction.bt_count = bt_count
    transaction.ble_count = ble_count
    transaction.cell_count = cell_count
    transaction.gps_points = gps_points
    transaction.new_networks = new_wifi_count
    transaction.updated_networks = updated_wifi_count
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
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Badge evaluation failed for user %s: %s", user.id, e)

    try:
        from app.services.stats_cache import invalidate_stats
        await invalidate_stats()
    except Exception:
        pass


async def _process_wifi_batch(
    db: AsyncSession,
    batch: list[NetworkObservation],
    transaction: UploadTransaction,
    user: User,
) -> tuple[int, int, int, set[int]]:
    """Process a batch of WiFi observations with bulk lookups.

    Returns (new_count, updated_count, skipped_count, retrilaterate_ids).
    """
    new_count = 0
    updated_count = 0
    skipped_count = 0
    retrilaterate_ids: set[int] = set()
    # Track BSSIDs of new networks needing retrilateration (resolved after flush)
    new_bssids_to_retrilaterate: set[str] = set()

    # Bulk pre-fetch all existing networks for this batch in ONE query
    bssids = list({obs.identifier for obs in batch})
    existing_networks: dict[str, WifiNetwork] = {}

    for chunk_start in range(0, len(bssids), 500):
        chunk = bssids[chunk_start:chunk_start + 500]
        result = await db.execute(
            select(WifiNetwork).where(WifiNetwork.bssid.in_(chunk))
        )
        for net in result.scalars().all():
            existing_networks[net.bssid] = net

    # Collect new networks to bulk-add
    new_networks: list[WifiNetwork] = []
    # Map bssid -> list of observations waiting for network_id
    pending_obs_for_new: dict[str, list[NetworkObservation]] = defaultdict(list)

    observations_to_add: list[WifiObservation] = []

    for obs in batch:
        seen_at = obs.seen_at or datetime.now(timezone.utc)
        network = existing_networks.get(obs.identifier)

        if network is None and obs.identifier not in {n.bssid for n in new_networks}:
            # Brand new network
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
            new_networks.append(network)
            existing_networks[obs.identifier] = network
            pending_obs_for_new[obs.identifier].append(obs)
            new_count += 1
            continue
        elif network is None:
            # Network already being created in this batch
            network = existing_networks[obs.identifier]
            pending_obs_for_new[obs.identifier].append(obs)
            updated_count += 1
            new_bssids_to_retrilaterate.add(obs.identifier)
            continue

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

        observations_to_add.append(WifiObservation(
            network_id=network.id,
            transaction_id=transaction.id,
            user_id=user.id,
            rssi=obs.rssi,
            latitude=obs.latitude,
            longitude=obs.longitude,
            altitude=obs.altitude,
            accuracy=obs.accuracy,
            seen_at=seen_at,
        ))

        if changed:
            updated_count += 1
        else:
            skipped_count += 1
        retrilaterate_ids.add(network.id)

    # Bulk-add new networks and flush to get IDs
    if new_networks:
        db.add_all(new_networks)
        await db.flush()

        # Now create observations for new networks (they have IDs now)
        for net in new_networks:
            for obs in pending_obs_for_new.get(net.bssid, []):
                seen_at = obs.seen_at or datetime.now(timezone.utc)
                observations_to_add.append(WifiObservation(
                    network_id=net.id,
                    transaction_id=transaction.id,
                    user_id=user.id,
                    rssi=obs.rssi,
                    latitude=obs.latitude,
                    longitude=obs.longitude,
                    altitude=obs.altitude,
                    accuracy=obs.accuracy,
                    seen_at=seen_at,
                ))
            # Resolve BSSID-based retrilateration tracking to real DB IDs
            if net.bssid in new_bssids_to_retrilaterate:
                retrilaterate_ids.add(net.id)

    # Bulk-add all observations
    if observations_to_add:
        db.add_all(observations_to_add)

    return new_count, updated_count, skipped_count, retrilaterate_ids


async def _process_bt_batch(
    db: AsyncSession,
    batch: list[NetworkObservation],
    user: User,
) -> tuple[int, int, int, set[int]]:
    """Process a batch of BT/BLE observations with bulk lookups."""
    new_count = 0
    updated_count = 0
    skipped_count = 0

    macs = list({obs.identifier for obs in batch})
    existing: dict[str, BtNetwork] = {}

    for chunk_start in range(0, len(macs), 500):
        chunk = macs[chunk_start:chunk_start + 500]
        result = await db.execute(
            select(BtNetwork).where(BtNetwork.mac.in_(chunk))
        )
        for net in result.scalars().all():
            existing[net.mac] = net

    seen_new: set[str] = set()

    for obs in batch:
        seen_at = obs.seen_at or datetime.now(timezone.utc)
        network = existing.get(obs.identifier)

        if network is None and obs.identifier not in seen_new:
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
            existing[obs.identifier] = network
            seen_new.add(obs.identifier)
            new_count += 1
            continue
        elif network is None:
            network = existing[obs.identifier]

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
        if changed:
            updated_count += 1
        else:
            skipped_count += 1

    return new_count, updated_count, skipped_count, set()


async def _process_cell_batch(
    db: AsyncSession,
    batch: list[NetworkObservation],
    user: User,
) -> tuple[int, int, int, set[int]]:
    """Process a batch of cell tower observations."""
    new_count = 0
    updated_count = 0
    skipped_count = 0

    # Cell towers have composite keys, so we need to fetch all and match in-memory
    # Filter valid observations first
    valid_obs = [
        o for o in batch
        if o.radio and o.mcc is not None and o.mnc is not None and o.cid is not None
    ]
    skipped_count += len(batch) - len(valid_obs)

    if not valid_obs:
        return new_count, updated_count, skipped_count, set()

    # Build composite keys for lookup
    def cell_key(o):
        return (o.radio, o.mcc, o.mnc, o.lac, o.cid)

    keys = list({cell_key(o) for o in valid_obs})
    existing: dict[tuple, CellTower] = {}

    # Fetch existing towers - use OR conditions for composite keys
    # Process in chunks to avoid query size limits
    for chunk_start in range(0, len(keys), 200):
        chunk = keys[chunk_start:chunk_start + 200]
        for radio, mcc, mnc, lac, cid in chunk:
            result = await db.execute(
                select(CellTower).where(
                    CellTower.radio == radio,
                    CellTower.mcc == mcc,
                    CellTower.mnc == mnc,
                    CellTower.lac == lac,
                    CellTower.cid == cid,
                )
            )
            tower = result.scalar_one_or_none()
            if tower:
                existing[(radio, mcc, mnc, lac, cid)] = tower

    seen_new: set[tuple] = set()

    for obs in valid_obs:
        seen_at = obs.seen_at or datetime.now(timezone.utc)
        key = cell_key(obs)
        tower = existing.get(key)

        if tower is None and key not in seen_new:
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
            existing[key] = tower
            seen_new.add(key)
            new_count += 1
            continue
        elif tower is None:
            tower = existing[key]

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
        if changed:
            updated_count += 1
        else:
            skipped_count += 1

    return new_count, updated_count, skipped_count, set()


async def _retrilaterate_networks_bulk(
    db: AsyncSession, network_ids: set[int]
) -> None:
    """Recalculate positions for networks using all stored observations.

    Optimized: fetches ALL observations for ALL networks in one query,
    then processes in memory.
    """
    if not network_ids:
        return

    network_id_list = list(network_ids)

    # Fetch all observations for all networks in ONE query
    all_obs_by_network: dict[int, list] = defaultdict(list)

    for chunk_start in range(0, len(network_id_list), 500):
        chunk = network_id_list[chunk_start:chunk_start + 500]
        result = await db.execute(
            select(WifiObservation).where(
                WifiObservation.network_id.in_(chunk),
                WifiObservation.latitude.isnot(None),
                WifiObservation.longitude.isnot(None),
                WifiObservation.rssi.isnot(None),
            )
        )
        for obs_row in result.scalars().all():
            all_obs_by_network[obs_row.network_id].append(obs_row)

    # Filter networks with enough observations
    networks_to_update = {
        nid: obs_list for nid, obs_list in all_obs_by_network.items()
        if len(obs_list) >= 2
    }

    if not networks_to_update:
        return

    # Fetch all networks to update in ONE query
    update_ids = list(networks_to_update.keys())
    networks_by_id: dict[int, WifiNetwork] = {}

    for chunk_start in range(0, len(update_ids), 500):
        chunk = update_ids[chunk_start:chunk_start + 500]
        result = await db.execute(
            select(WifiNetwork).where(WifiNetwork.id.in_(chunk))
        )
        for net in result.scalars().all():
            networks_by_id[net.id] = net

    # Trilaterate each network in memory (CPU-bound but fast)
    for network_id, obs_rows in networks_to_update.items():
        observations = [
            Observation(latitude=o.latitude, longitude=o.longitude, rssi=o.rssi)
            for o in obs_rows
            if o.latitude and o.longitude and o.rssi
        ]
        if not observations:
            continue

        new_lat, new_lon = trilaterate(observations)

        network = networks_by_id.get(network_id)
        if network:
            network.latitude = new_lat
            network.longitude = new_lon


def _normalize_seen_at(value: datetime | None) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
