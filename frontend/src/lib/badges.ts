export type TierName = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic'

export interface TierStyle {
  name: TierName
  label: string
  color: string
  bgColor: string
  borderColor: string
  glowClass: string
}

const TIER_STYLES: Record<number, TierStyle> = {
  1: { name: 'common',    label: 'Common',    color: '#6b7280', bgColor: 'rgba(107,114,128,0.1)', borderColor: 'rgba(107,114,128,0.3)', glowClass: 'glow-common' },
  2: { name: 'uncommon',  label: 'Uncommon',  color: '#22c55e', bgColor: 'rgba(34,197,94,0.1)',   borderColor: 'rgba(34,197,94,0.3)',   glowClass: 'glow-uncommon' },
  3: { name: 'rare',      label: 'Rare',      color: '#3b82f6', bgColor: 'rgba(59,130,246,0.1)',  borderColor: 'rgba(59,130,246,0.3)',  glowClass: 'glow-rare' },
  4: { name: 'epic',      label: 'Epic',      color: '#a855f7', bgColor: 'rgba(168,85,247,0.1)', borderColor: 'rgba(168,85,247,0.3)', glowClass: 'glow-epic' },
  5: { name: 'legendary', label: 'Legendary', color: '#fbbf24', bgColor: 'rgba(251,191,36,0.1)', borderColor: 'rgba(251,191,36,0.3)', glowClass: 'glow-legendary' },
  6: { name: 'mythic',    label: 'Mythic',    color: '#ec4899', bgColor: 'rgba(236,72,153,0.1)', borderColor: 'rgba(236,72,153,0.3)', glowClass: 'glow-mythic' },
  7: { name: 'mythic',    label: 'Mythic II',  color: '#ec4899', bgColor: 'rgba(236,72,153,0.15)', borderColor: 'rgba(236,72,153,0.4)', glowClass: 'glow-mythic' },
  8: { name: 'mythic',    label: 'Mythic III', color: '#f43f5e', bgColor: 'rgba(244,63,94,0.15)',  borderColor: 'rgba(244,63,94,0.4)',  glowClass: 'glow-mythic' },
  9: { name: 'mythic',    label: 'Mythic IV',  color: '#f43f5e', bgColor: 'rgba(244,63,94,0.2)',   borderColor: 'rgba(244,63,94,0.5)',  glowClass: 'glow-mythic' },
  10:{ name: 'mythic',    label: 'Mythic V',   color: '#ff1744', bgColor: 'rgba(255,23,68,0.2)',   borderColor: 'rgba(255,23,68,0.5)',  glowClass: 'glow-mythic' },
}

export function getTierStyle(tier: number): TierStyle {
  return TIER_STYLES[tier] ?? TIER_STYLES[1]
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    wifi: 'WiFi Discovery',
    bluetooth: 'Bluetooth Hunting',
    cell: 'Tower Defense',
    upload: 'Feed the Machine',
    xp: 'XP Milestones',
    level: 'Level Milestones',
    special: 'Special Ops',
    encryption: 'Security Audit',
  }
  return labels[category] ?? category
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    wifi: 'Wifi',
    bluetooth: 'Bluetooth',
    cell: 'Radio',
    upload: 'Upload',
    xp: 'Star',
    level: 'Trophy',
    special: 'Shield',
    encryption: 'Lock',
  }
  return icons[category] ?? 'Award'
}
