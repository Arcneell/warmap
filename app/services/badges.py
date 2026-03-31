"""Badge evaluation engine.

Checks if a user qualifies for badges after actions (upload, etc.)
and awards them automatically.
"""

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.badge import BadgeDefinition, UserBadge
from app.models.network import BtNetwork, CellTower, WifiNetwork
from app.models.transaction import UploadTransaction
from app.models.user import User

logger = logging.getLogger(__name__)

# SVG icons for badge categories (16x16 viewBox, stroke-based)
_ICONS = {
    "wifi": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>',
    "bluetooth": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11"/></svg>',
    "cell": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 20V4"/></svg>',
    "upload": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
    "xp": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    "level": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 15l-3 3 1.5 1.5L12 18l1.5 1.5L15 18l-3-3z"/><path d="M18 6l-3-3-3 3-3-3-3 3 6 6 6-6z"/><path d="M6 6v6l6 6 6-6V6"/></svg>',
    "special": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
    "shield": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    "lock": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    "unlock": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
    "crown": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 20h20"/><path d="M4 17L2 7l5 4 5-6 5 6 5-4-2 10H4z"/></svg>',
    "radar": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="2" x2="12" y2="6"/></svg>',
    "compass": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
    "rocket": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
    "eye": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
    "trophy": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M4 5h16v4a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6V5z"/><path d="M12 15v4"/><path d="M8 21h8"/></svg>',
    "gem": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M2 9h20"/><path d="M12 22L6 9"/><path d="M12 22l6-13"/></svg>',
    "flame": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    "tower": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20"/><path d="M8 6l4-4 4 4"/><path d="M4 10h16"/><path d="M7 10v12"/><path d="M17 10v12"/><path d="M4 22h16"/></svg>',
    "bolt": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    "ghost": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2 2 3-3 3 3 2-2 3 3V10a8 8 0 0 0-8-8z"/></svg>',
    "crystal": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2l-4 7h8l-4-7z"/><path d="M8 9l-6 7h20l-6-7"/><path d="M2 16l10 6 10-6"/></svg>',
}

# ── Badge seeds ──
# Higher thresholds, more tiers, technical humor
BADGE_SEEDS = [
    # --- WiFi milestones (10 tiers) ---
    {"slug": "wifi_10",      "name": "Noob Scanner",        "description": "Discover 10 WiFi networks. It's a start... we'll say.",                      "icon_svg": _ICONS["wifi"],    "category": "wifi", "tier": 1,  "criteria_type": "wifi_count", "criteria_value": 10},
    {"slug": "wifi_100",     "name": "SSID Collector",      "description": "Discover 100 WiFi networks. You're filling up the Pokedex.",                 "icon_svg": _ICONS["wifi"],    "category": "wifi", "tier": 2,  "criteria_type": "wifi_count", "criteria_value": 100},
    {"slug": "wifi_500",     "name": "Hotspot Hoarder",     "description": "Discover 500 WiFi networks. Your mom says you spend too much time outside.", "icon_svg": _ICONS["radar"],   "category": "wifi", "tier": 3,  "criteria_type": "wifi_count", "criteria_value": 500},
    {"slug": "wifi_2500",    "name": "Access Point Addict", "description": "Discover 2,500 WiFi networks. It's not an addiction, it's science.",         "icon_svg": _ICONS["compass"], "category": "wifi", "tier": 4,  "criteria_type": "wifi_count", "criteria_value": 2500},
    {"slug": "wifi_10000",   "name": "RF Cartographer",     "description": "Discover 10,000 WiFi networks. Google Maps asks you for advice.",            "icon_svg": _ICONS["compass"], "category": "wifi", "tier": 5,  "criteria_type": "wifi_count", "criteria_value": 10000},
    {"slug": "wifi_25000",   "name": "Wardriving Veteran",  "description": "Discover 25,000 WiFi networks. You've scanned more networks than some countries have.",  "icon_svg": _ICONS["rocket"], "category": "wifi", "tier": 6, "criteria_type": "wifi_count", "criteria_value": 25000},
    {"slug": "wifi_50000",   "name": "Spectrum Overlord",   "description": "Discover 50,000 WiFi networks. Radio waves recognize you on the street.",    "icon_svg": _ICONS["crown"],   "category": "wifi", "tier": 7,  "criteria_type": "wifi_count", "criteria_value": 50000},
    {"slug": "wifi_100000",  "name": "The Omniscient",      "description": "Discover 100,000 WiFi networks. You ARE the Internet.",                      "icon_svg": _ICONS["eye"],     "category": "wifi", "tier": 8,  "criteria_type": "wifi_count", "criteria_value": 100000},
    {"slug": "wifi_250000",  "name": "802.11 Demigod",      "description": "Discover 250,000 WiFi networks. The IEEE wrote a paper about you.",          "icon_svg": _ICONS["crystal"], "category": "wifi", "tier": 9,  "criteria_type": "wifi_count", "criteria_value": 250000},
    {"slug": "wifi_500000",  "name": "The WiFi Itself",     "description": "Discover 500,000 WiFi networks. You don't connect to WiFi. WiFi connects to you.", "icon_svg": _ICONS["gem"], "category": "wifi", "tier": 10, "criteria_type": "wifi_count", "criteria_value": 500000},

    # --- Bluetooth milestones (8 tiers) ---
    {"slug": "bt_10",    "name": "Bluetooth Curious",   "description": "Discover 10 BT devices. Just the tip of the iceberg.",                     "icon_svg": _ICONS["bluetooth"], "category": "bluetooth", "tier": 1, "criteria_type": "bt_count", "criteria_value": 10},
    {"slug": "bt_100",   "name": "Pairing Enthusiast",  "description": "Discover 100 BT devices. Connection accepted.",                            "icon_svg": _ICONS["bluetooth"], "category": "bluetooth", "tier": 2, "criteria_type": "bt_count", "criteria_value": 100},
    {"slug": "bt_500",   "name": "BLE Stalker",         "description": "Discover 500 BT devices. Your scanning range is... concerning.",            "icon_svg": _ICONS["bluetooth"], "category": "bluetooth", "tier": 3, "criteria_type": "bt_count", "criteria_value": 500},
    {"slug": "bt_2000",  "name": "Bluetooth Bender",    "description": "Discover 2,000 BT devices. Even lost AirPods fear you.",                   "icon_svg": _ICONS["bluetooth"], "category": "bluetooth", "tier": 4, "criteria_type": "bt_count", "criteria_value": 2000},
    {"slug": "bt_5000",  "name": "The Tooth Fairy",     "description": "Discover 5,000 BT devices. You collect blue teeth.",                       "icon_svg": _ICONS["crown"],     "category": "bluetooth", "tier": 5, "criteria_type": "bt_count", "criteria_value": 5000},
    {"slug": "bt_10000", "name": "Frequency Hoarder",   "description": "Discover 10,000 BT devices. 2.4GHz band asks for personal space.",         "icon_svg": _ICONS["radar"],     "category": "bluetooth", "tier": 6, "criteria_type": "bt_count", "criteria_value": 10000},
    {"slug": "bt_25000", "name": "BLE Whisperer",       "description": "Discover 25,000 BT devices. Devices pair with you automatically.",         "icon_svg": _ICONS["ghost"],     "category": "bluetooth", "tier": 7, "criteria_type": "bt_count", "criteria_value": 25000},
    {"slug": "bt_50000", "name": "King Harald",          "description": "Discover 50,000 BT devices. Named after the Viking king, obviously.",     "icon_svg": _ICONS["gem"],       "category": "bluetooth", "tier": 8, "criteria_type": "bt_count", "criteria_value": 50000},

    # --- Cell tower milestones (8 tiers) ---
    {"slug": "cell_10",    "name": "Tower Spotter",          "description": "Discover 10 cell towers. You look up at the right moments.",           "icon_svg": _ICONS["cell"],  "category": "cell", "tier": 1, "criteria_type": "cell_count", "criteria_value": 10},
    {"slug": "cell_100",   "name": "Cell Seeker",            "description": "Discover 100 cell towers. Antennas hold no more secrets.",             "icon_svg": _ICONS["cell"],  "category": "cell", "tier": 2, "criteria_type": "cell_count", "criteria_value": 100},
    {"slug": "cell_500",   "name": "IMSI Catcher Catcher",   "description": "Discover 500 cell towers. You catch the catchers.",                   "icon_svg": _ICONS["tower"], "category": "cell", "tier": 3, "criteria_type": "cell_count", "criteria_value": 500},
    {"slug": "cell_2000",  "name": "Grid Architect",         "description": "Discover 2,000 cell towers. You could work at a telco.",              "icon_svg": _ICONS["tower"], "category": "cell", "tier": 4, "criteria_type": "cell_count", "criteria_value": 2000},
    {"slug": "cell_5000",  "name": "Telco Overlord",         "description": "Discover 5,000 cell towers. Carriers send you job offers.",            "icon_svg": _ICONS["bolt"],  "category": "cell", "tier": 5, "criteria_type": "cell_count", "criteria_value": 5000},
    {"slug": "cell_10000", "name": "Infrastructure Oracle",  "description": "Discover 10,000 cell towers. You see the grid in your sleep.",        "icon_svg": _ICONS["eye"],   "category": "cell", "tier": 6, "criteria_type": "cell_count", "criteria_value": 10000},
    {"slug": "cell_25000", "name": "Spectrum Sovereign",     "description": "Discover 25,000 cell towers. FCC calls you for consultations.",       "icon_svg": _ICONS["crown"], "category": "cell", "tier": 7, "criteria_type": "cell_count", "criteria_value": 25000},
    {"slug": "cell_50000", "name": "The Base Station",       "description": "Discover 50,000 cell towers. You don't find towers. Towers find you.","icon_svg": _ICONS["gem"],   "category": "cell", "tier": 8, "criteria_type": "cell_count", "criteria_value": 50000},

    # --- Upload milestones (8 tiers) ---
    {"slug": "upload_1",    "name": "First Blood",        "description": "Upload your first file. The first one is always special.",           "icon_svg": _ICONS["upload"], "category": "upload", "tier": 1, "criteria_type": "upload_count", "criteria_value": 1},
    {"slug": "upload_10",   "name": "Regular Feeder",     "description": "Upload 10 files. The machine is hungry, keep going.",                "icon_svg": _ICONS["upload"], "category": "upload", "tier": 2, "criteria_type": "upload_count", "criteria_value": 10},
    {"slug": "upload_50",   "name": "Data Pusher",        "description": "Upload 50 files. You push more than your git repo.",                 "icon_svg": _ICONS["upload"], "category": "upload", "tier": 3, "criteria_type": "upload_count", "criteria_value": 50},
    {"slug": "upload_100",  "name": "Pipeline Operator",  "description": "Upload 100 files. CI/CD of wardriving.",                             "icon_svg": _ICONS["rocket"], "category": "upload", "tier": 4, "criteria_type": "upload_count", "criteria_value": 100},
    {"slug": "upload_250",  "name": "Data Firehose",      "description": "Upload 250 files. AWS Kinesis sends you its resume.",                 "icon_svg": _ICONS["flame"],  "category": "upload", "tier": 5, "criteria_type": "upload_count", "criteria_value": 250},
    {"slug": "upload_500",  "name": "The Upload God",     "description": "Upload 500 files. You've uploaded more data than Wikipedia.",         "icon_svg": _ICONS["trophy"], "category": "upload", "tier": 6, "criteria_type": "upload_count", "criteria_value": 500},
    {"slug": "upload_1000", "name": "Bandwidth Incarnate", "description": "Upload 1,000 files. Your ISP writes to you personally.",            "icon_svg": _ICONS["crown"],  "category": "upload", "tier": 7, "criteria_type": "upload_count", "criteria_value": 1000},
    {"slug": "upload_2500", "name": "The ETL Pipeline",    "description": "Upload 2,500 files. You are the data warehouse.",                   "icon_svg": _ICONS["gem"],    "category": "upload", "tier": 8, "criteria_type": "upload_count", "criteria_value": 2500},

    # --- XP milestones (8 tiers) ---
    {"slug": "xp_100",     "name": "First Sparks",    "description": "Earn 100 XP. Everybody starts somewhere.",                      "icon_svg": _ICONS["xp"],      "category": "xp", "tier": 1, "criteria_type": "xp", "criteria_value": 100},
    {"slug": "xp_1000",    "name": "Warming Up",      "description": "Earn 1,000 XP. The grind begins.",                              "icon_svg": _ICONS["xp"],      "category": "xp", "tier": 2, "criteria_type": "xp", "criteria_value": 1000},
    {"slug": "xp_5000",    "name": "Getting Serious",  "description": "Earn 5,000 XP. This is no longer casual.",                     "icon_svg": _ICONS["xp"],      "category": "xp", "tier": 3, "criteria_type": "xp", "criteria_value": 5000},
    {"slug": "xp_25000",   "name": "Veteran Status",   "description": "Earn 25,000 XP. Your dedication is showing.",                  "icon_svg": _ICONS["flame"],   "category": "xp", "tier": 4, "criteria_type": "xp", "criteria_value": 25000},
    {"slug": "xp_100000",  "name": "XP Hoarder",       "description": "Earn 100,000 XP. You could buy a castle with these points.",   "icon_svg": _ICONS["flame"],   "category": "xp", "tier": 5, "criteria_type": "xp", "criteria_value": 100000},
    {"slug": "xp_500000",  "name": "Grind Lord",       "description": "Earn 500,000 XP. Sleep is for the weak.",                      "icon_svg": _ICONS["crystal"], "category": "xp", "tier": 6, "criteria_type": "xp", "criteria_value": 500000},
    {"slug": "xp_1000000", "name": "Millionaire",       "description": "Earn 1,000,000 XP. XP millionaire. Real money? Not so much.", "icon_svg": _ICONS["crown"],   "category": "xp", "tier": 7, "criteria_type": "xp", "criteria_value": 1000000},
    {"slug": "xp_5000000", "name": "Transcendent",      "description": "Earn 5,000,000 XP. You've transcended mortal grinding.",      "icon_svg": _ICONS["gem"],     "category": "xp", "tier": 8, "criteria_type": "xp", "criteria_value": 5000000},

    # --- Level milestones (8 tiers) ---
    {"slug": "level_5",   "name": "SSID Stalker",     "description": "Reach level 5. You're starting to see the signals.",             "icon_svg": _ICONS["level"],  "category": "level", "tier": 1, "criteria_type": "level", "criteria_value": 5},
    {"slug": "level_10",  "name": "RF Scout",          "description": "Reach level 10. Double digits. Respect.",                       "icon_svg": _ICONS["level"],  "category": "level", "tier": 2, "criteria_type": "level", "criteria_value": 10},
    {"slug": "level_20",  "name": "Wave Rider",        "description": "Reach level 20. You ride the electromagnetic wave.",            "icon_svg": _ICONS["level"],  "category": "level", "tier": 3, "criteria_type": "level", "criteria_value": 20},
    {"slug": "level_35",  "name": "Root Shell Ronin",  "description": "Reach level 35. The samurai of the spectrum.",                  "icon_svg": _ICONS["level"],  "category": "level", "tier": 4, "criteria_type": "level", "criteria_value": 35},
    {"slug": "level_50",  "name": "Frequency Ghost",   "description": "Reach level 50. Half-way to immortality.",                     "icon_svg": _ICONS["ghost"],  "category": "level", "tier": 5, "criteria_type": "level", "criteria_value": 50},
    {"slug": "level_70",  "name": "Shadow Broker",     "description": "Reach level 70. Your BSSID knowledge is terrifying.",           "icon_svg": _ICONS["eye"],    "category": "level", "tier": 6, "criteria_type": "level", "criteria_value": 70},
    {"slug": "level_85",  "name": "NSA's Most Wanted", "description": "Reach level 85. They monitor you back.",                       "icon_svg": _ICONS["crown"],  "category": "level", "tier": 7, "criteria_type": "level", "criteria_value": 85},
    {"slug": "level_100", "name": "The WiFi Itself",   "description": "Reach max level 100. I am the 802.11 protocol.",               "icon_svg": _ICONS["gem"],    "category": "level", "tier": 8, "criteria_type": "level", "criteria_value": 100},

    # --- Encryption specials ---
    {"slug": "wep_10",            "name": "WEP Archaeologist",   "description": "Find 10 WEP networks. Digital archaeology at its finest.",                "icon_svg": _ICONS["unlock"],  "category": "special", "tier": 1, "criteria_type": "wep_count", "criteria_value": 10},
    {"slug": "wep_100",           "name": "WEP Fossil Hunter",   "description": "Find 100 WEP networks. You still find WEP in 2026?!",                    "icon_svg": _ICONS["unlock"],  "category": "special", "tier": 3, "criteria_type": "wep_count", "criteria_value": 100},
    {"slug": "wep_500",           "name": "WEP Extinction Event","description": "Find 500 WEP networks. You've documented an endangered species.",         "icon_svg": _ICONS["unlock"],  "category": "special", "tier": 5, "criteria_type": "wep_count", "criteria_value": 500},
    {"slug": "open_50",           "name": "Open Season",         "description": "Find 50 open networks. Humanity is lost.",                                "icon_svg": _ICONS["lock"],    "category": "special", "tier": 1, "criteria_type": "open_count", "criteria_value": 50},
    {"slug": "open_500",          "name": "Security Nihilist",   "description": "Find 500 open networks. You've seen too much unencrypted traffic.",       "icon_svg": _ICONS["lock"],    "category": "special", "tier": 3, "criteria_type": "open_count", "criteria_value": 500},
    {"slug": "open_2000",         "name": "The Password Is...",  "description": "Find 2,000 open networks. There is no password. There never was.",        "icon_svg": _ICONS["lock"],    "category": "special", "tier": 5, "criteria_type": "open_count", "criteria_value": 2000},
    {"slug": "wpa3_50",           "name": "WPA3 Pioneer",        "description": "Find 50 WPA3 networks. Preaching the good word of encryption.",           "icon_svg": _ICONS["shield"],  "category": "special", "tier": 1, "criteria_type": "wpa3_count", "criteria_value": 50},
    {"slug": "wpa3_500",          "name": "WPA3 Evangelist",     "description": "Find 500 WPA3 networks. The future is now, old man.",                     "icon_svg": _ICONS["shield"],  "category": "special", "tier": 3, "criteria_type": "wpa3_count", "criteria_value": 500},
    {"slug": "wpa3_5000",         "name": "WPA3 Prophet",        "description": "Find 5,000 WPA3 networks. You've seen the promised land of encryption.",  "icon_svg": _ICONS["shield"],  "category": "special", "tier": 5, "criteria_type": "wpa3_count", "criteria_value": 5000},
]


async def seed_badges(db: AsyncSession):
    """Insert or update badge definitions."""
    for badge_data in BADGE_SEEDS:
        existing = await db.execute(
            select(BadgeDefinition).where(BadgeDefinition.slug == badge_data["slug"])
        )
        badge = existing.scalar_one_or_none()
        if badge:
            for key, value in badge_data.items():
                if key != "slug":
                    setattr(badge, key, value)
        else:
            db.add(BadgeDefinition(**badge_data))
    await db.commit()


async def evaluate_badges(db: AsyncSession, user: User) -> list[str]:
    """Check all badge criteria for a user and award any newly earned badges."""
    from app.services.xp import level_from_xp

    result = await db.execute(
        select(UserBadge.badge_id).where(UserBadge.user_id == user.id)
    )
    owned_badge_ids = {row[0] for row in result.all()}

    result = await db.execute(select(BadgeDefinition))
    all_badges = result.scalars().all()

    wifi_count = await db.scalar(
        select(func.count(WifiNetwork.id)).where(WifiNetwork.discovered_by == user.id)
    ) or 0
    bt_count = await db.scalar(
        select(func.count(BtNetwork.id)).where(BtNetwork.discovered_by == user.id)
    ) or 0
    cell_count = await db.scalar(
        select(func.count(CellTower.id)).where(CellTower.discovered_by == user.id)
    ) or 0
    upload_count = await db.scalar(
        select(func.count(UploadTransaction.id)).where(
            UploadTransaction.user_id == user.id,
            UploadTransaction.status == "done",
        )
    ) or 0

    wep_count = await db.scalar(
        select(func.count(WifiNetwork.id)).where(
            WifiNetwork.discovered_by == user.id, WifiNetwork.encryption == "WEP",
        )
    ) or 0
    open_count = await db.scalar(
        select(func.count(WifiNetwork.id)).where(
            WifiNetwork.discovered_by == user.id, WifiNetwork.encryption == "Open",
        )
    ) or 0
    wpa3_count = await db.scalar(
        select(func.count(WifiNetwork.id)).where(
            WifiNetwork.discovered_by == user.id, WifiNetwork.encryption == "WPA3",
        )
    ) or 0

    user_values = {
        "wifi_count": wifi_count, "bt_count": bt_count, "cell_count": cell_count,
        "upload_count": upload_count, "xp": user.xp, "level": level_from_xp(user.xp),
        "wep_count": wep_count, "open_count": open_count, "wpa3_count": wpa3_count,
    }

    newly_awarded = []
    for badge in all_badges:
        if badge.id in owned_badge_ids:
            continue
        if not badge.criteria_type or badge.criteria_value is None:
            continue
        current_value = user_values.get(badge.criteria_type, 0)
        if current_value >= badge.criteria_value:
            db.add(UserBadge(user_id=user.id, badge_id=badge.id))
            newly_awarded.append(badge.slug)

    if newly_awarded:
        await db.commit()
        logger.info("User %s earned badges: %s", user.id, newly_awarded)

    return newly_awarded


async def get_user_badges(db: AsyncSession, user_id: int) -> list[dict]:
    """Get all badges for a user, including unearned ones."""
    result = await db.execute(
        select(BadgeDefinition).order_by(BadgeDefinition.category, BadgeDefinition.tier)
    )
    all_badges = result.scalars().all()

    result = await db.execute(
        select(UserBadge).where(UserBadge.user_id == user_id)
    )
    earned = {ub.badge_id: ub.earned_at for ub in result.scalars().all()}

    badges = []
    for b in all_badges:
        badges.append({
            "id": b.id,
            "slug": b.slug,
            "name": b.name,
            "description": b.description,
            "icon_svg": b.icon_svg,
            "category": b.category,
            "tier": b.tier,
            "criteria_type": b.criteria_type,
            "criteria_value": b.criteria_value,
            "earned": b.id in earned,
            "earned_at": earned[b.id].isoformat() if b.id in earned else None,
        })
    return badges
