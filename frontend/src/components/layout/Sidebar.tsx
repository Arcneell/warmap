import { useAuthStore } from '@/stores/authStore'
import { useMapStore } from '@/stores/mapStore'
import { useUIStore } from '@/stores/uiStore'
import { useMyProfile, useGlobalStats } from '@/api/hooks'
import { XPBar } from '@/components/rpg/XPBar'
import { formatNumber, encryptionColor } from '@/lib/format'
import { Wifi, Bluetooth, Radio, X } from 'lucide-react'
import { SearchField } from '@/components/ui/SearchField'
import { useState } from 'react'
import { BrandLogo } from '@/components/brand/BrandLogo'

export function Sidebar() {
  const { isAuthenticated } = useAuthStore()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const {
    mineOnly, toggleMineOnly, showBtLayer, toggleBtLayer,
    showCellLayer, toggleCellLayer, encryptionFilters, setEncryptionFilter,
  } = useMapStore()
  const { data: profile } = useMyProfile(isAuthenticated)
  const { data: stats } = useGlobalStats()
  const [ssidSearch, setSsidSearch] = useState('')
  const encryptions = ['WPA3', 'WPA2', 'WPA', 'WEP', 'Open', 'Unknown']

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-ink/40 z-[55] lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
      )}

      <aside
        className={`
          leather-tabs w-[280px] flex-shrink-0 overflow-y-auto
          flex flex-col gap-4 p-4 lg:p-5
          fixed inset-y-0 left-0 z-[60] transition-transform duration-300 ease-out
          lg:static lg:z-auto lg:translate-x-0 lg:h-full lg:min-h-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Map tools and filters"
      >
        {/* Mobile close */}
        <div className="flex lg:hidden items-center justify-between gap-3 pb-3 mb-1 border-b border-black/20">
          <div className="flex items-center gap-2 min-w-0">
            <BrandLogo className="w-8 h-8" />
            <span className="font-display font-bold text-base text-parchment/95 truncate">Wardrove</span>
          </div>
          <button type="button" onClick={() => setSidebarOpen(false)} className="p-2 text-parchment/80 hover:text-parchment" aria-label="Close">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Profile */}
        {isAuthenticated && profile && (
          <section className="rulebook-frame p-4 bg-parchment space-y-3">
            <h2 className="font-display text-center text-xs font-bold tracking-[0.15em] uppercase text-wax-red border-b border-black/20 pb-2">
              Your seal
            </h2>
            <div className="flex items-center gap-3">
              {profile.avatar_url && (
                <img src={profile.avatar_url} alt="" className="w-10 h-10 border-2 border-ink object-cover shrink-0" style={{ boxShadow: '2px 2px 0 0 #1a1a1a' }} />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-display font-semibold text-sm text-ink truncate">{profile.username}</p>
                <p className="font-display text-xs text-sepia">{profile.rank}</p>
              </div>
            </div>
            <XPBar xp={profile.xp} level={profile.level} xpProgress={profile.xp_progress} xpCurrent={profile.xp_current_level} xpNext={profile.xp_next_level} compact />
          </section>
        )}

        {/* World tally */}
        {stats && (
          <section className="rulebook-frame p-4 bg-parchment space-y-3">
            <h2 className="font-display text-center text-xs font-bold tracking-[0.15em] uppercase text-wax-red border-b border-black/20 pb-2">
              World tally
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <LedgerStat icon={<Wifi size={16} strokeWidth={1.75} />} value={stats.total_wifi} label="WiFi" color="text-wifi" />
              <LedgerStat icon={<Bluetooth size={16} strokeWidth={1.75} />} value={stats.total_bt} label="BT" color="text-bt" />
              <LedgerStat icon={<Radio size={16} strokeWidth={1.75} />} value={stats.total_cell} label="Cell" color="text-cell" />
            </div>
          </section>
        )}

        {/* Encryption */}
        <section className="rulebook-frame p-4 bg-parchment space-y-3">
          <h2 className="font-display text-center text-xs font-bold tracking-[0.15em] uppercase text-wax-red border-b border-black/20 pb-2">
            Encryption sigils
          </h2>
          <div className="flex flex-col gap-1.5">
            {encryptions.map((enc) => (
              <label key={enc} className="flex items-center gap-2 text-sm cursor-pointer group font-mono text-ink">
                <input
                  type="checkbox"
                  checked={encryptionFilters[enc] ?? true}
                  onChange={(e) => setEncryptionFilter(enc, e.target.checked)}
                  className="w-3.5 h-3.5 accent-wax-red border-2 border-ink shrink-0"
                />
                <span className="w-2.5 h-2.5 shrink-0 border border-ink" style={{ backgroundColor: encryptionColor(enc) }} />
                <span className="text-sepia group-hover:text-ink transition-colors">{enc}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Layers */}
        <section className="rulebook-frame p-4 bg-parchment space-y-3">
          <h2 className="font-display text-center text-xs font-bold tracking-[0.15em] uppercase text-wax-red border-b border-black/20 pb-2">
            Layers
          </h2>
          <div className="flex flex-col gap-1">
            {isAuthenticated && <LayerToggle active={mineOnly} onClick={toggleMineOnly} label="My networks only" />}
            <LayerToggle active={showBtLayer} onClick={toggleBtLayer} label="Bluetooth devices" />
            <LayerToggle active={showCellLayer} onClick={toggleCellLayer} label="Cell towers" />
          </div>
        </section>

        {/* Search */}
        <section className="rulebook-frame p-4 bg-parchment space-y-3">
          <h2 className="font-display text-center text-xs font-bold tracking-[0.15em] uppercase text-wax-red border-b border-black/20 pb-2">
            SSID search
          </h2>
          <SearchField value={ssidSearch} onChange={setSsidSearch} placeholder="Network name..." />
        </section>

        {/* Top SSIDs */}
        {stats?.top_ssids && stats.top_ssids.length > 0 && (
          <section className="rulebook-frame p-4 bg-parchment space-y-3">
            <h2 className="font-display text-center text-xs font-bold tracking-[0.15em] uppercase text-wax-red border-b border-black/20 pb-2">
              Top SSIDs
            </h2>
            <div className="flex flex-col">
              {stats.top_ssids.slice(0, 8).map((s, i) => (
                <div key={i} className="flex justify-between items-center text-xs py-1.5 border-b border-ink/10 last:border-0 font-mono">
                  <span className="text-ink truncate max-w-[160px]">{s.ssid || '<hidden>'}</span>
                  <span className="text-sepia flex-shrink-0 ml-2 tabular-nums">{formatNumber(s.count)}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </aside>
    </>
  )
}

function LedgerStat({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`${color}`}>{icon}</span>
      <span className={`font-mono font-bold text-base tabular-nums ${color}`}>{formatNumber(value)}</span>
      <span className="text-[10px] text-sepia uppercase tracking-wider">{label}</span>
    </div>
  )
}

function LayerToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm font-mono transition-colors border ${
        active
          ? 'bg-[#ebe4d0] text-wax-red border-ink'
          : 'text-sepia hover:text-ink border-transparent hover:border-ink/30'
      }`}
      style={active ? { boxShadow: '2px 2px 0 0 #1a1a1a' } : undefined}
    >
      {label}
    </button>
  )
}
