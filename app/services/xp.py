XP_PER_IMPORT = 1
XP_PER_UPDATE = 0
XP_PER_SESSION = 5
MAX_LEVEL = 100

RANK_TITLES = {
    1: "Script Kiddie",
    3: "Packet Sniffer",
    5: "Signal Hunter",
    8: "Spectrum Crawler",
    12: "RF Scout",
    16: "Wave Rider",
    22: "Airspace Mapper",
    30: "Ether Walker",
    40: "Frequency Ghost",
    55: "Wardriving Legend",
    70: "Phantom Scanner",
    85: "Radio God",
    100: "Omniscient Eye",
}


def xp_for_level(level: int) -> int:
    if level <= 1:
        return 0
    # Very long progression curve:
    # level 100 requires ~5.94M XP (mostly unique AP discoveries).
    lvl = min(level, MAX_LEVEL)
    return lvl * (lvl - 1) * (lvl + 20) * 5


def level_from_xp(xp: int) -> int:
    level = 1
    while level < MAX_LEVEL and xp_for_level(level + 1) <= xp:
        level += 1
    return level


def rank_title(level: int) -> str:
    title = "Script Kiddie"
    for threshold, name in sorted(RANK_TITLES.items()):
        if level >= threshold:
            title = name
    return title
