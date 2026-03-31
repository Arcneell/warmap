import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Map, Trophy, BarChart3, Upload,
  Menu, LogIn, LogOut, Swords, Shield, X,
} from 'lucide-react'
import { BrandLogo } from '@/components/brand/BrandLogo'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { formatXP } from '@/lib/xp'

const NAV_ITEMS = [
  { path: '/',            icon: Map,       label: 'Map' },
  { path: '/armory',      icon: Swords,    label: 'Armory' },
  { path: '/leaderboard', icon: Trophy,    label: 'Arena' },
  { path: '/stats',       icon: BarChart3, label: 'World' },
]

const AUTH_NAV = [
  { path: '/quarters', icon: Shield, label: 'Quarters' },
]

export function HUD() {
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { user, isAuthenticated } = useAuthStore()
  const { setLoginModalOpen, setUploadModalOpen, toggleSidebar } = useUIStore()
  const isMapRoute = location.pathname === '/'

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <header className="grimoire-ribbon flex-shrink-0 z-50">
      {/* Top row: logo + actions */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center gap-3">
        {/* Sidebar toggle (map page only, mobile) */}
        {isMapRoute && (
          <button
            type="button"
            onClick={() => toggleSidebar()}
            className="lg:hidden btn-parchment p-2"
            aria-label="Open map tools"
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>
        )}

        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 min-w-0 group" onClick={() => setMobileNavOpen(false)}>
          <div className="shrink-0 parchment-scrap p-1 flex items-center justify-center">
            <BrandLogo className="w-9 h-9 sm:w-10 sm:h-10" />
          </div>
          <span className="font-display font-bold text-lg sm:text-xl text-ink tracking-wide hidden sm:block">
            Wardrove
          </span>
        </Link>

        <div className="flex-1" />

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <button type="button" onClick={() => setUploadModalOpen(true)} className="btn-parchment">
                <Upload size={16} strokeWidth={1.75} />
                <span className="hidden sm:inline">Upload</span>
              </button>

              <Link to="/quarters" className="hidden md:flex items-center gap-3 px-2 py-1.5 hover:bg-black/5 transition-colors" onClick={() => setMobileNavOpen(false)}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-8 h-8 border-2 border-ink object-cover" style={{ boxShadow: '2px 2px 0 0 #1a1a1a' }} />
                ) : (
                  <div className="w-8 h-8 border-2 border-ink bg-parchment flex items-center justify-center font-display font-bold text-sm text-wax-red" style={{ boxShadow: '2px 2px 0 0 #1a1a1a' }}>
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-display font-semibold text-ink">{user?.username}</span>
                  <span className="text-xs font-mono text-sepia">Lvl {user?.level} · {formatXP(user?.xp ?? 0)} XP</span>
                </div>
              </Link>

              <button
                type="button"
                onClick={async () => {
                  await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
                  useAuthStore.getState().clearAuth()
                }}
                className="p-2 text-sepia hover:text-wax-red transition-colors"
                title="Log out"
              >
                <LogOut size={16} strokeWidth={1.75} />
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setLoginModalOpen(true)} className="btn-parchment">
              <LogIn size={16} strokeWidth={1.75} />
              <span className="hidden sm:inline">Login</span>
            </button>
          )}

          {/* Mobile nav toggle */}
          <button
            type="button"
            className="md:hidden btn-parchment p-2"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((o) => !o)}
          >
            {mobileNavOpen ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
          </button>
        </div>
      </div>

      {/* Nav row */}
      <nav
        className={`${mobileNavOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row md:items-center gap-1 px-4 sm:px-6 lg:px-8 pb-3 sm:pb-4 border-t border-black/15 pt-3`}
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            onClick={() => setMobileNavOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-display font-semibold transition-colors ${
              isActive(path)
                ? 'text-wax-red border-b-2 border-wax-red'
                : 'text-sepia hover:text-ink'
            }`}
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </Link>
        ))}

        {isAuthenticated && AUTH_NAV.map(({ path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            onClick={() => setMobileNavOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-display font-semibold transition-colors ${
              isActive(path)
                ? 'text-wax-red border-b-2 border-wax-red'
                : 'text-sepia hover:text-ink'
            }`}
          >
            <Icon size={16} strokeWidth={1.75} />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
