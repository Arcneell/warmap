import { useState, useEffect, useCallback, useRef } from 'react'
import { apiFetch, authFetch, BASE } from './client'
import type {
  GlobalStats, LeaderboardEntry, UserProfile, Badge,
  BtDevice, CellTower, UploadTransaction, PaginatedResponse,
  ChannelStat, ManufacturerStat, CountryStat,
} from './types'

// Simple hook for data fetching with caching
function useAPI<T>(path: string | null, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!path) return
    setLoading(true)
    setError(null)
    try {
      const result = await apiFetch<T>(path)
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [path, ...deps])

  useEffect(() => { reload() }, [reload])

  return { data, loading, error, reload }
}

// ── Stats ──
export function useGlobalStats() {
  return useAPI<GlobalStats>('/stats/')
}

export function useLeaderboard(sortBy: string = 'xp', limit = 50, offset = 0) {
  return useAPI<LeaderboardEntry[]>(
    `/stats/leaderboard?sort_by=${sortBy}&limit=${limit}&offset=${offset}`,
    [sortBy, limit, offset],
  )
}

export function useChannelStats() {
  return useAPI<ChannelStat[]>('/stats/channels')
}

export function useManufacturerStats(limit = 30) {
  return useAPI<ManufacturerStat[]>(`/stats/manufacturers?limit=${limit}`)
}

export function useCountryStats() {
  return useAPI<CountryStat[]>('/stats/countries')
}

export function useTopSSIDs(limit = 20) {
  return useAPI<Array<{ ssid: string; count: number }>>(`/stats/top-ssids?limit=${limit}`)
}

// ── Profile ──
export function useMyProfile(enabled = true) {
  return useAPI<UserProfile>(enabled ? '/profile/' : null)
}

export function useUserProfile(userId: number | string | undefined) {
  return useAPI<UserProfile>(userId ? `/profile/${userId}` : null, [userId])
}

export function useUserBadges(userId: number | undefined) {
  return useAPI<Badge[]>(userId ? `/profile/${userId}/badges` : null, [userId])
}

// ── Bluetooth ──
export function useBtDevices(offset = 0, limit = 50, search = '') {
  const q = search ? `&name=${encodeURIComponent(search)}` : ''
  return useAPI<PaginatedResponse<BtDevice>>(
    `/networks/bt?offset=${offset}&limit=${limit}${q}`,
    [offset, limit, search],
  )
}

// ── Cell ──
export function useCellTowers(offset = 0, limit = 50, radio = '') {
  const q = radio ? `&radio=${radio}` : ''
  return useAPI<PaginatedResponse<CellTower>>(
    `/networks/cell?offset=${offset}&limit=${limit}${q}`,
    [offset, limit, radio],
  )
}

// ── Uploads ──
export function useUploadHistory(limit = 50, offset = 0, enabled = true) {
  return useAPI<UploadTransaction[]>(
    enabled ? `/upload/?limit=${limit}&offset=${offset}` : null,
    [limit, offset],
  )
}

// ── Upload SSE ──
export function useUploadSSE(transactionId: number | null) {
  const [status, setStatus] = useState<UploadTransaction | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!transactionId) return
    const es = new EventSource(`${BASE}/upload/status/${transactionId}/stream`)
    eventSourceRef.current = es

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setStatus(data)
        if (data.status === 'done' || data.status === 'error') {
          es.close()
        }
      } catch {}
    }

    es.onerror = () => { es.close() }

    return () => { es.close() }
  }, [transactionId])

  return status
}

// ── File upload ──
export function useFileUpload() {
  const [uploading, setUploading] = useState(false)
  const [transactions, setTransactions] = useState<Array<{ transaction_id: number; status: string }>>([])

  const upload = useCallback(async (files: File[]) => {
    setUploading(true)
    try {
      const formData = new FormData()
      files.forEach((f) => formData.append('files', f))
      const res = await authFetch('/upload/', { method: 'POST', body: formData })
      if (res.ok) {
        const data = await res.json()
        setTransactions(data)
        return data
      }
      throw new Error('Upload failed')
    } finally {
      setUploading(false)
    }
  }, [])

  return { upload, uploading, transactions }
}
