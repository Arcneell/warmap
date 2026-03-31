import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Map, Radio, Trophy, BarChart3, Upload,
  Menu, LogIn, LogOut, Swords, Shield, X,
} from 'lucide-react'
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
      <div className="px-4 sm:px-8 lg:px-12 py-6 sm:py-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            {isMapRoute && (
              <button
                type="button"
                onClick={() => toggleSidebar()}
                className="lg:hidden shrink-0 flex items-center justify-center w-11 h-11 border-2 border-ink bg-parchment text-ink hover:text-wax-red transition-colors"
                style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
                aria-label="Open map tools"
              >
                <Menu size={22} strokeWidth={1.75} />
              </button>
            )}

            <Link
              to="/"
              className="flex items-center gap-4 min-w-0 group"
              onClick={() => setMobileNavOpen(false)}
            >
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 border-[3px] border-double border-ink bg-parchment shrink-0 flex items-center justify-center"
                style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
              >
                <Radio size={22} strokeWidth={1.85} className="text-wax-red" />
              </div>
              <div className="leading-relaxed min-w-0 hidden sm:block">
                <h1 className="font-display font-bold text-lg sm:text-xl tracking-[0.12em] text-ink border-b border-black/30 pb-2 text-center sm:text-left">
                  <span className="text-gold-tarnish">WARD</span>
                  <span className="text-sepia">ROVE</span>
                </h1>
                <p className="font-sans text-xs text-sepia mt-2 tracking-wide max-w-[14rem] leading-loose">
                  Open grimoire
                </p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 flex-wrap justify-end">
            {isAuthenticated ? (
              <>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-3 border-2 border-ink bg-parchment text-xs sm:text-sm font-display font-bold text-ink hover:text-wax-red transition-colors leading-relaxed"
                  style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
                >
                  <Upload size={18} strokeWidth={1.75} className="shrink-0 text-ink" />
                  <span className="hidden sm:inline">Upload</span>
                </button>

                <Link
                  to="/quarters"
                  className="hidden md:flex items-center gap-3 px-2 py-1 border-2 border-transparent hover:border-dashed hover:border-ink transition-colors"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="w-10 h-10 border-2 border-ink object-cover"
                      style={{ boxShadow: '2px 2px 0 0 #1a1a1a' }}
                    />
                  ) : (
                    <div
                      className="w-10 h-10 border-2 border-ink bg-parchment flex items-center justify-center font-display font-bold text-wax-red"
                      style={{ boxShadow: '2px 2px 0 0 #1a1a1a' }}
                    >
                      {user?.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col text-left leading-relaxed">
                    <span className="text-sm font-display font-semibold text-ink group-hover:text-wax-red">
                      {user?.username}
                    </span>
                    <span className="text-[11px] font-mono text-sepia">
                      Lvl {user?.level} · {formatXP(user?.xp ?? 0)} XP
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={async () => {
                    await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
                    useAuthStore.getState().clearAuth()
                  }}
                  className="p-3 border-2 border-transparent text-ink hover:text-wax-red hover:border-dashed hover:border-ink transition-colors"
                  title="Log out"
                >
                  <LogOut size={18} strokeWidth={1.75} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setLoginModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 border-2 border-ink bg-parchment text-sm font-display font-bold text-gold-tarnish hover:text-wax-red transition-colors leading-relaxed"
                style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
              >
                <LogIn size={18} strokeWidth={1.75} />
                <span className="hidden sm:inline">Login</span>
              </button>
            )}

            <button
              type="button"
              className="md:hidden flex items-center justify-center w-11 h-11 border-2 border-ink bg-parchment"
              style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((o) => !o)}
            >
              {mobileNavOpen ? <X size={22} strokeWidth={1.75} /> : <Menu size={22} strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        {/* Ruban : liens comme encre / marque-pages */}
        <nav
          className={`${mobileNavOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row md:flex-wrap md:items-center gap-4 md:gap-8 lg:gap-10 pb-2 border-t border-black/25 pt-6`}
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileNavOpen(false)}
              className={`flex items-center gap-3 text-sm sm:text-base font-display font-semibold leading-loose transition-colors ${
                isActive(path)
                  ? 'text-wax-red border-b-2 border-wax-red pb-1'
                  : 'text-sepia hover:text-wax-red border-b-2 border-transparent hover:border-black/30 pb-1'
              }`}
            >
              <Icon size={18} strokeWidth={1.75} className="text-ink shrink-0 opacity-90" />
              {label}
            </Link>
          ))}

          {isAuthenticated &&
            AUTH_NAV.map(({ path, icon: Icon, label }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileNavOpen(false)}
                className={`flex items-center gap-3 text-sm sm:text-base font-display font-semibold leading-loose transition-colors md:border-l md:border-black/25 md:pl-10 ${
                  isActive(path)
                    ? 'text-gold-tarnish border-b-2 border-gold-tarnish pb-1'
                    : 'text-sepia hover:text-gold-tarnish border-b-2 border-transparent hover:border-black/30 pb-1'
                }`}
              >
                <Icon size={18} strokeWidth={1.75} className="text-ink shrink-0 opacity-90" />
                {label}
              </Link>
            ))}
        </nav>
      </div>
    </header>
  )
}
