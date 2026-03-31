import { Link, useLocation } from 'react-router-dom'
import {
  Map, Radio, Trophy, BarChart3, Upload,
  Menu, LogIn, LogOut, Swords, Shield,
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
  { path: '/quarters',    icon: Shield,    label: 'Quarters' },
]

export function HUD() {
  const location = useLocation()
  const { user, isAuthenticated } = useAuthStore()
  const { setLoginModalOpen, setUploadModalOpen, toggleSidebar } = useUIStore()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <header className="h-14 bg-panel border-b border-border flex items-center px-4 gap-3 flex-shrink-0 z-50 relative">
      {/* Scan line decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
        <div className="w-full h-px bg-xp animate-scan-line" />
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-1.5 rounded-lg border border-border text-secondary hover:text-primary transition-colors"
      >
        <Menu size={18} />
      </button>

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 mr-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-wifi to-xp flex items-center justify-center">
          <Radio size={14} className="text-void" />
        </div>
        <span className="font-mono font-bold text-lg tracking-tight hidden sm:block">
          <span className="text-wifi">War</span>
          <span className="text-secondary">drove</span>
        </span>
      </Link>

      {/* Nav tabs */}
      <nav className="flex gap-1 overflow-x-auto">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              isActive(path)
                ? 'bg-wifi/15 text-wifi border border-wifi/30'
                : 'text-secondary hover:text-primary hover:bg-surface border border-transparent'
            }`}
          >
            <Icon size={14} />
            <span className="hidden md:inline">{label}</span>
          </Link>
        ))}

        {isAuthenticated && AUTH_NAV.map(({ path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              isActive(path)
                ? 'bg-epic/15 text-epic border border-epic/30'
                : 'text-secondary hover:text-primary hover:bg-surface border border-transparent'
            }`}
          >
            <Icon size={14} />
            <span className="hidden md:inline">{label}</span>
          </Link>
        ))}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        {isAuthenticated && (
          <>
            {/* Upload button */}
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-xp/15 text-xp border border-xp/30 hover:bg-xp/25 transition-all"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">Upload</span>
            </button>

            {/* Mini XP bar + profile */}
            <Link to="/quarters" className="flex items-center gap-2 group">
              {user?.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt=""
                  className="w-7 h-7 rounded-full border-2 border-epic/50 group-hover:border-epic transition-colors"
                />
              )}
              <div className="hidden sm:flex flex-col items-end">
                <span className="font-mono text-xs font-semibold text-primary group-hover:text-wifi transition-colors">
                  {user?.username}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold text-legendary">
                    Lvl {user?.level}
                  </span>
                  <span className="text-[10px] font-mono text-xp">
                    {formatXP(user?.xp ?? 0)} XP
                  </span>
                </div>
              </div>
            </Link>

            <button
              onClick={async () => {
                await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' })
                useAuthStore.getState().clearAuth()
              }}
              className="p-1.5 rounded-lg text-secondary hover:text-danger transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </>
        )}

        {!isAuthenticated && (
          <button
            onClick={() => setLoginModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-wifi/15 text-wifi border border-wifi/30 hover:bg-wifi/25 transition-all"
          >
            <LogIn size={14} />
            <span>Login</span>
          </button>
        )}
      </div>
    </header>
  )
}
