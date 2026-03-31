import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HUD } from '@/components/layout/HUD'
import { ToastContainer } from '@/components/rpg/AchievementToast'
import { LoginModal } from '@/components/ui/LoginModal'
import { UploadModal } from '@/components/ui/UploadModal'
import { useAuthStore } from '@/stores/authStore'
import { refreshToken, apiFetch } from '@/api/client'
import type { User } from '@/api/types'
import { Loader2 } from 'lucide-react'

const MapPage = lazy(() => import('@/pages/MapPage').then(m => ({ default: m.MapPage })))
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })))
const ArmoryPage = lazy(() => import('@/pages/ArmoryPage').then(m => ({ default: m.ArmoryPage })))
const StatsPage = lazy(() => import('@/pages/StatsPage').then(m => ({ default: m.StatsPage })))
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const MyQuarters = lazy(() => import('@/pages/MyQuarters').then(m => ({ default: m.MyQuarters })))
const TermsPage = lazy(() => import('@/pages/TermsPage').then(m => ({ default: m.TermsPage })))

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[12rem] p-12">
      <div className="text-center">
        <Loader2 size={36} strokeWidth={1.5} className="text-wax-red animate-spin mx-auto mb-4" />
        <p className="font-display text-sm text-sepia tracking-wide">Unfurling the scroll…</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/armory" element={<ArmoryPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/quarters" element={<MyQuarters />} />
        <Route path="/terms" element={<TermsPage />} />
      </Routes>
    </Suspense>
  )
}

function AuthInitializer() {
  const { setToken, setUser } = useAuthStore()

  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search)
      const authCode = params.get('auth_code')

      if (authCode) {
        window.history.replaceState({}, '', '/')
        try {
          const res = await fetch('/api/v1/auth/exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auth_code: authCode }),
          })
          if (res.ok) {
            const data = await res.json()
            setToken(data.access_token, data.expires_in)
          }
        } catch {}
      } else {
        await refreshToken()
      }

      const token = useAuthStore.getState().accessToken
      if (token) {
        try {
          const user = await apiFetch<User>('/auth/me')
          setUser(user)
        } catch {}
      }
    }

    init()
  }, [])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthInitializer />
      {/* Table en bois : marge généreuse, grimoire centré */}
      <div className="h-full min-h-0 flex flex-col p-4 sm:p-6 md:p-8 lg:p-10 box-border">
        <div className="grimoire-sheet flex flex-col flex-1 min-h-0 rounded-[2px] border-[3px] border-double border-ink max-w-[1600px] w-full mx-auto overflow-hidden">
          <HUD />
          <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <AppRoutes />
          </main>
        </div>
      </div>
      <LoginModal />
      <UploadModal />
      <ToastContainer />
    </BrowserRouter>
  )
}
