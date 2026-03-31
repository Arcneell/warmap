export const MAX_LEVEL = 100

export const RANK_TITLES: Record<number, { name: string; flavor: string }> = {
  1:   { name: 'Script Kiddie',           flavor: '"sudo make me a sandwich"' },
  3:   { name: 'Packet Peasant',          flavor: '"tcpdump and chill"' },
  5:   { name: 'SSID Stalker',            flavor: '"Sees networks everywhere"' },
  8:   { name: 'Deauth Apprentice',       flavor: '"Hands off aireplay, padawan"' },
  12:  { name: 'Wardrive-by Shooter',     flavor: '"Drive slow, scan fast"' },
  16:  { name: 'Man-in-the-Middle Earth', flavor: '"One ring to sniff them all"' },
  22:  { name: 'Rogue AP Exorcist',       flavor: '"Who you gonna call?"' },
  30:  { name: 'Root Shell Ronin',        flavor: '"rm -rf /doubt"' },
  40:  { name: 'Frequency Ghost',         flavor: '"2.4GHz? I don\'t even see it anymore"' },
  55:  { name: 'Kismet Whisperer',        flavor: '"The packets speak to me"' },
  70:  { name: 'Shadow Broker',           flavor: '"I know every BSSID in this city"' },
  85:  { name: 'NSA\'s Most Wanted',      flavor: '"They monitor me back"' },
  100: { name: 'The WiFi Itself',         flavor: '"I am the 802.11 protocol"' },
}

export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  const lvl = Math.min(level, MAX_LEVEL)
  return lvl * (lvl - 1) * (lvl + 20) * 5
}

export function levelFromXp(xp: number): number {
  let level = 1
  while (level < MAX_LEVEL && xpForLevel(level + 1) <= xp) {
    level++
  }
  return level
}

export function rankTitle(level: number): { name: string; flavor: string } {
  let result = RANK_TITLES[1]
  for (const [threshold, data] of Object.entries(RANK_TITLES)) {
    if (level >= Number(threshold)) {
      result = data
    }
  }
  return result
}

export function xpProgress(xp: number, level: number) {
  const currentLevelXp = xpForLevel(level)
  const nextLevelXp = xpForLevel(Math.min(level + 1, MAX_LEVEL))
  const needed = nextLevelXp - currentLevelXp
  const progress = needed > 0 ? (xp - currentLevelXp) / needed : 1
  return { currentLevelXp, nextLevelXp, needed, progress: Math.min(1, Math.max(0, progress)) }
}

export function formatXP(xp: number): string {
  if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`
  if (xp >= 1_000) return `${(xp / 1_000).toFixed(1)}K`
  return String(xp)
}
