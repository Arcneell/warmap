import { create } from 'zustand'
import type { User } from '@/api/types'

interface AuthState {
  accessToken: string | null
  tokenExpiresAt: number
  user: User | null
  isAuthenticated: boolean
  setToken: (token: string, expiresIn: number) => void
  setUser: (user: User | null) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  tokenExpiresAt: 0,
  user: null,
  isAuthenticated: false,
  setToken: (token, expiresIn) =>
    set({
      accessToken: token,
      tokenExpiresAt: Date.now() + expiresIn * 1000,
      isAuthenticated: true,
    }),
  setUser: (user) => set({ user }),
  clearAuth: () =>
    set({
      accessToken: null,
      tokenExpiresAt: 0,
      user: null,
      isAuthenticated: false,
    }),
}))
