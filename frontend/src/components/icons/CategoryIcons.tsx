/** Hand-drawn style SVG icons for D&D parchment aesthetic */

interface IconProps {
  size?: number
  className?: string
}

/** Shield with WiFi waves — for WPA3 */
export function IconShieldWifi({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9.5 12a4 4 0 015 0" />
      <path d="M7.5 10a7 7 0 019 0" />
      <circle cx="12" cy="14" r="0.5" fill="currentColor" />
    </svg>
  )
}

/** Key with lock — for WPA2 */
export function IconKeyLock({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="1" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
      <circle cx="12" cy="16" r="1.5" fill="currentColor" />
      <path d="M12 17.5V19" />
    </svg>
  )
}

/** Broken chain — for WEP */
export function IconBrokenChain({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className={className}>
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      <path d="M9 9l1.5-1.5" strokeDasharray="2 2" />
      <path d="M15 15l-1.5 1.5" strokeDasharray="2 2" />
    </svg>
  )
}

/** Open door — for Open networks */
export function IconOpenDoor({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className={className}>
      <path d="M3 21h18" />
      <path d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" />
      <path d="M9 21V12h6v9" />
      <circle cx="15" cy="10" r="0.75" fill="currentColor" />
    </svg>
  )
}

/** Compass rose — for navigation/map */
export function IconCompassRose({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polygon points="12,2 14,10 12,8 10,10" fill="currentColor" opacity="0.4" />
      <polygon points="12,22 14,14 12,16 10,14" fill="currentColor" opacity="0.15" />
      <polygon points="2,12 10,10 8,12 10,14" fill="currentColor" opacity="0.15" />
      <polygon points="22,12 14,10 16,12 14,14" fill="currentColor" opacity="0.15" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

/** Scroll with quill — for uploads */
export function IconScrollQuill({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className={className}>
      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h3" />
      <path d="M8 17h6" />
    </svg>
  )
}

/** Crown — for leaderboard */
export function IconCrown({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className={className}>
      <path d="M2 20h20" />
      <path d="M4 17L2 7l5 4 5-6 5 6 5-4-2 10H4z" />
    </svg>
  )
}

/** Tower signal — for cell towers */
export function IconTowerSignal({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className={className}>
      <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
      <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4" />
      <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4" />
      <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  )
}

/** Bluetooth rune */
export function IconBluetoothRune({ size = 20, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className={className}>
      <path d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11" />
    </svg>
  )
}
