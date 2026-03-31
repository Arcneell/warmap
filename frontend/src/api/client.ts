import { useAuthStore } from '@/stores/authStore'

const BASE = '/api/v1'

async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (res.ok) {
      const data = await res.json()
      useAuthStore.getState().setToken(data.access_token, data.expires_in)
      return true
    }
  } catch {}
  useAuthStore.getState().clearAuth()
  return false
}

export async function authFetch(
  path: string,
  opts: RequestInit = {},
): Promise<Response> {
  const store = useAuthStore.getState()

  // Auto-refresh 30s before expiry
  if (store.accessToken && Date.now() > store.tokenExpiresAt - 30_000) {
    await refreshToken()
  }

  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string>),
  }

  const token = useAuthStore.getState().accessToken
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(`${BASE}${path}`, { ...opts, headers })
}

export async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, opts)
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`)
  }
  return res.json()
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  opts: RequestInit = {},
): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    ...opts,
  })
}

export { refreshToken, BASE }
