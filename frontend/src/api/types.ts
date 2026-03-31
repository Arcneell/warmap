// ── Auth ──
export interface User {
  id: number
  username: string
  email: string | null
  avatar_url: string | null
  xp: number
  level: number
  rank: string
  oauth_provider: string
  is_admin: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface ApiToken {
  id: number
  name: string
  token?: string
  last_used: string | null
  expires_at: string | null
  created_at: string
  revoked: boolean
}

// ── Networks ──
export interface WifiNetwork {
  id: number
  bssid: string
  ssid: string
  encryption: string
  channel: number
  frequency: number | null
  rssi: number
  latitude: number
  longitude: number
  first_seen: string
  last_seen: string
  seen_count: number
}

export interface BtDevice {
  id: number
  mac: string
  name: string | null
  device_type: 'BT' | 'BLE'
  rssi: number
  latitude: number
  longitude: number
  first_seen: string
  last_seen: string
  seen_count: number
}

export interface CellTower {
  id: number
  radio: string
  mcc: number
  mnc: number
  lac: number
  cid: number
  rssi: number | null
  latitude: number
  longitude: number
  first_seen: string
  last_seen: string
  seen_count: number
}

// ── Stats ──
export interface GlobalStats {
  total_wifi: number
  total_bt: number
  total_cell: number
  total_users: number
  total_uploads: number
  by_encryption: Record<string, number>
  top_ssids: Array<{ ssid: string; count: number }>
}

export interface LeaderboardEntry {
  rank: number
  user_id: number
  username: string
  avatar_url: string | null
  xp: number
  level: number
  rank_title: string
  wifi_discovered: number
  bt_discovered: number
  cell_discovered: number
}

export interface ChannelStat {
  channel: number
  count: number
}

export interface ManufacturerStat {
  manufacturer: string
  count: number
}

export interface CountryStat {
  country: string
  mcc: number
  count: number
}

// ── Profile ──
export interface UserProfile {
  user_id: number
  username: string
  avatar_url: string | null
  xp: number
  level: number
  rank: string
  global_rank: number
  wifi_discovered: number
  bt_discovered: number
  cell_discovered: number
  total_uploads: number
  xp_current_level: number
  xp_next_level: number
  xp_progress: number
  xp_needed: number
  badges?: Badge[]
  created_at?: string
}

export interface Badge {
  id: number
  slug: string
  name: string
  description: string
  icon_svg: string
  category: string
  tier: number
  criteria_type: string
  criteria_value: number
  earned: boolean
  earned_at: string | null
}

// ── Upload ──
export interface UploadTransaction {
  id: number
  filename: string
  file_size: number | null
  file_format: string | null
  status: 'pending' | 'parsing' | 'trilaterating' | 'indexing' | 'done' | 'error'
  status_message: string | null
  wifi_count: number
  bt_count: number
  ble_count: number
  cell_count: number
  gps_points: number
  new_networks: number
  updated_networks: number
  skipped_networks: number
  xp_earned: number
  uploaded_at: string
  completed_at: string | null
  queue_position?: number
  queue_total?: number
}

// ── Groups ──
export interface Group {
  id: number
  name: string
  description: string | null
  created_by: number
  created_at: string
  member_count: number
}

export interface GroupMember {
  user_id: number
  username: string
  avatar_url: string | null
  role: 'admin' | 'member'
  xp: number
  level: number
  wifi_discovered: number
  bt_discovered: number
  cell_discovered: number
}

// ── Paginated ──
export interface PaginatedResponse<T> {
  results: T[]
  next_cursor: string | null
  total?: number
}

// ── GeoJSON ──
export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

export interface GeoJSONFeature {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: Record<string, unknown>
}

// ── Queue ──
export interface QueueStatus {
  pending: number
  parsing: number
  trilaterating: number
  indexing: number
  done: number
  error: number
  total_in_queue: number
}
