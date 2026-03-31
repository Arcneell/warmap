XP_PER_IMPORT = 1
XP_PER_BT = 2
XP_PER_CELL = 3
XP_PER_UPDATE = 0.1
XP_PER_SESSION = 10
XP_DAILY_BONUS = 25
XP_WEEKLY_STREAK = 100
MAX_LEVEL = 100

RANK_TITLES = {
    1: "Script Kiddie",
    3: "Packet Peasant",
    5: "SSID Stalker",
    8: "Deauth Apprentice",
    12: "Wardrive-by Shooter",
    16: "Man-in-the-Middle Earth",
    22: "Rogue AP Exorcist",
    30: "Root Shell Ronin",
    40: "Frequency Ghost",
    55: "Kismet Whisperer",
    70: "Shadow Broker",
    85: "NSA's Most Wanted",
    100: "The WiFi Itself",
}

RANK_FLAVORS = {
    1: '"sudo make me a sandwich"',
    3: '"tcpdump and chill"',
    5: '"Sees networks everywhere"',
    8: '"Hands off aireplay, padawan"',
    12: '"Drive slow, scan fast"',
    16: '"One ring to sniff them all"',
    22: '"Who you gonna call?"',
    30: '"rm -rf /doubt"',
    40: '"2.4GHz? I don\'t even see it anymore"',
    55: '"The packets speak to me"',
    70: '"I know every BSSID in this city"',
    85: '"They monitor me back"',
    100: '"I am the 802.11 protocol"',
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


def rank_flavor(level: int) -> str:
    flavor = RANK_FLAVORS[1]
    for threshold, text in sorted(RANK_FLAVORS.items()):
        if level >= threshold:
            flavor = text
    return flavor
