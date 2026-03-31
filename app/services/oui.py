"""OUI (Organizationally Unique Identifier) manufacturer lookup.

Provides manufacturer name from the first 3 bytes of a MAC address.
Uses a built-in dict of common OUIs. Can be extended by downloading
the IEEE OUI database.
"""

# Top ~100 most common WiFi OUIs
OUI_DB: dict[str, str] = {
    "00:00:5E": "IANA", "00:0C:29": "VMware", "00:0D:93": "Apple",
    "00:11:24": "Apple", "00:14:51": "Apple", "00:16:CB": "Apple",
    "00:17:F2": "Apple", "00:19:E3": "Apple", "00:1B:63": "Apple",
    "00:1C:B3": "Apple", "00:1D:4F": "Apple", "00:1E:52": "Apple",
    "00:1E:C2": "Apple", "00:1F:5B": "Apple", "00:1F:F3": "Apple",
    "00:21:E9": "Apple", "00:22:41": "Apple", "00:23:12": "Apple",
    "00:23:32": "Apple", "00:23:6C": "Apple", "00:23:DF": "Apple",
    "00:24:36": "Apple", "00:25:00": "Apple", "00:25:BC": "Apple",
    "00:26:08": "Apple", "00:26:4A": "Apple", "00:26:B0": "Apple",
    "00:26:BB": "Apple", "00:30:65": "Apple",
    "00:03:93": "Apple", "00:05:02": "Apple",
    "00:0A:27": "Apple", "00:0A:95": "Apple",
    "00:50:56": "VMware", "00:1A:11": "Google",
    "00:1A:6B": "Samsung", "00:12:FB": "Samsung",
    "00:15:99": "Samsung", "00:16:32": "Samsung",
    "00:17:D5": "Samsung", "00:18:AF": "Samsung",
    "00:1B:98": "Samsung", "00:1C:43": "Samsung",
    "00:1D:25": "Samsung", "00:1E:E1": "Samsung",
    "00:1E:E2": "Samsung", "00:21:19": "Samsung",
    "00:21:4C": "Samsung", "00:21:D1": "Samsung",
    "00:21:D2": "Samsung", "00:23:39": "Samsung",
    "00:23:3A": "Samsung", "00:23:99": "Samsung",
    "00:23:D6": "Samsung", "00:23:D7": "Samsung",
    "00:24:54": "Samsung", "00:24:90": "Samsung",
    "00:24:91": "Samsung", "00:25:66": "Samsung",
    "00:25:67": "Samsung", "00:26:37": "Samsung",
    "3C:5A:B4": "Google", "54:60:09": "Google",
    "F4:F5:D8": "Google", "F4:F5:E8": "Google",
    "00:18:0A": "Cisco", "00:18:18": "Cisco",
    "00:18:39": "Cisco", "00:18:73": "Cisco",
    "00:18:74": "Cisco", "00:19:2F": "Cisco",
    "00:19:30": "Cisco", "00:19:47": "Cisco",
    "00:19:55": "Cisco", "00:1A:2F": "Cisco",
    "00:1A:30": "Cisco", "00:1A:A1": "Cisco",
    "AC:F1:DF": "Cisco", "B0:AA:77": "Cisco",
    "00:1E:58": "D-Link", "00:22:B0": "D-Link",
    "00:24:01": "D-Link", "00:26:5A": "D-Link",
    "1C:7E:E5": "D-Link", "28:10:7B": "D-Link",
    "00:14:BF": "Linksys", "00:18:F8": "Linksys",
    "00:1A:70": "Linksys", "00:1C:10": "Linksys",
    "00:1D:7E": "Linksys", "00:1E:E5": "Linksys",
    "00:22:6B": "Linksys", "00:23:69": "Linksys",
    "00:25:9C": "Linksys", "20:AA:4B": "Linksys",
    "C0:C1:C0": "Linksys",
    "00:1F:33": "Netgear", "00:22:3F": "Netgear",
    "00:24:B2": "Netgear", "00:26:F2": "Netgear",
    "20:0C:C8": "Netgear", "2C:B0:5D": "Netgear",
    "30:46:9A": "Netgear", "44:94:FC": "Netgear",
    "04:A1:51": "Netgear",
    "00:1D:D9": "Hon Hai/Foxconn", "00:22:68": "Hon Hai/Foxconn",
    "00:24:2C": "Hon Hai/Foxconn", "00:26:22": "Hon Hai/Foxconn",
    "10:0B:A9": "Intel", "34:02:86": "Intel",
    "58:91:CF": "Intel", "68:17:29": "Intel",
    "7C:5C:F8": "Intel", "8C:8D:28": "Intel",
    "B4:6B:FC": "Intel", "B8:08:CF": "Intel",
    "DC:53:60": "Intel", "F8:63:3F": "Intel",
    "00:1C:BF": "Intel", "00:1D:E0": "Intel",
    "00:1E:64": "Intel", "00:1F:3B": "Intel",
    "B0:4E:26": "TP-Link", "14:CC:20": "TP-Link",
    "50:C7:BF": "TP-Link", "60:E3:27": "TP-Link",
    "C0:25:E9": "TP-Link", "EC:08:6B": "TP-Link",
    "F4:EC:38": "Espressif", "24:0A:C4": "Espressif",
    "24:62:AB": "Espressif", "30:AE:A4": "Espressif",
    "A4:CF:12": "Espressif", "AC:67:B2": "Espressif",
    "BC:DD:C2": "Espressif", "CC:50:E3": "Espressif",
    "DC:4F:22": "Espressif", "84:CC:A8": "Espressif",
    "00:1F:1F": "Edimax", "00:50:FC": "Edimax",
    "74:DA:38": "Edimax", "80:1F:12": "Edimax",
    "00:0E:8E": "SparkLAN",
    "00:26:5E": "Hon Hai/Foxconn",
    "B8:27:EB": "Raspberry Pi", "DC:A6:32": "Raspberry Pi",
    "E4:5F:01": "Raspberry Pi",
    "00:04:4B": "Nvidia", "48:B0:2D": "Nvidia",
    "00:1B:21": "Intel", "00:20:A6": "Proxim",
    "C8:3A:35": "Tenda",
    "00:E0:4C": "Realtek", "48:02:2A": "Realtek",
    "52:54:00": "QEMU/KVM",
    "08:00:27": "VirtualBox",
}


def lookup_oui(mac: str) -> str | None:
    """Look up manufacturer by MAC address prefix (first 3 octets)."""
    if not mac or len(mac) < 8:
        return None
    prefix = mac[:8].upper()
    return OUI_DB.get(prefix)


def get_manufacturer_stats(macs: list[str]) -> dict[str, int]:
    """Get manufacturer distribution from a list of MAC addresses."""
    counts: dict[str, int] = {}
    for mac in macs:
        mfr = lookup_oui(mac) or "Unknown"
        counts[mfr] = counts.get(mfr, 0) + 1
    return dict(sorted(counts.items(), key=lambda x: x[1], reverse=True))
