from dataclasses import dataclass


@dataclass
class Observation:
    latitude: float
    longitude: float
    rssi: int


def trilaterate(observations: list[Observation]) -> tuple[float, float]:
    """Weighted centroid using RSSI squared as weight (WiGLE-style)."""
    total_weight = 0.0
    weighted_lat = 0.0
    weighted_lon = 0.0

    for obs in observations:
        if obs.latitude and obs.longitude and obs.rssi:
            weight = obs.rssi ** 2
            weighted_lat += obs.latitude * weight
            weighted_lon += obs.longitude * weight
            total_weight += weight

    if total_weight == 0:
        # Fallback to first observation
        for obs in observations:
            if obs.latitude and obs.longitude:
                return obs.latitude, obs.longitude
        return 0.0, 0.0

    return weighted_lat / total_weight, weighted_lon / total_weight
