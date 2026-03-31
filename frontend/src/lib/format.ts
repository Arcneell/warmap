export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

export function formatCompact(n: number): string {
  return n.toLocaleString()
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return formatDate(iso)
}

export function encryptionColor(enc: string): string {
  const colors: Record<string, string> = {
    WPA3: 'var(--color-enc-wpa3)',
    WPA2: 'var(--color-enc-wpa2)',
    WPA: 'var(--color-enc-wpa)',
    WEP: 'var(--color-enc-wep)',
    Open: 'var(--color-enc-open)',
    Unknown: 'var(--color-enc-unknown)',
  }
  return colors[enc] ?? colors.Unknown
}

export function signalStrength(rssi: number): { label: string; color: string } {
  if (rssi >= -50) return { label: 'Excellent', color: '#00ff88' }
  if (rssi >= -60) return { label: 'Good', color: '#00d4ff' }
  if (rssi >= -70) return { label: 'Fair', color: '#f59e0b' }
  return { label: 'Weak', color: '#ef4444' }
}
