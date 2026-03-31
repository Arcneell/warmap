import { useAuthStore } from '@/stores/authStore'
import { useMapStore } from '@/stores/mapStore'
import { useUIStore } from '@/stores/uiStore'
import { useMyProfile, useGlobalStats } from '@/api/hooks'
import { XPBar } from '@/components/rpg/XPBar'
import { formatNumber, encryptionColor } from '@/lib/format'
import { Wifi, Bluetooth, Radio, X, Search } from 'lucide-react'
import { useState } from 'react'

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
        <div
          className="fixed inset-0 bg-ink/40 z-[55] lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`
          leather-tabs
          w-[min(100vw-2.5rem,320px)]
          flex-shrink-0 overflow-y-auto
          flex flex-col gap-8 p-8 lg:p-10
          fixed inset-y-0 left-0 z-[60] transition-transform duration-300 ease-out
          lg:static lg:z-auto lg:translate-x-0 lg:h-full lg:min-h-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Map tools and filters"
      >
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden self-end p-2 border-2 border-dashed border-black/40 text-parchment/90 hover:text-parchment mb-2"
          aria-label="Close"
        >
          <X size={22} strokeWidth={1.75} />
        </button>

        {isAuthenticated && profile && (
          <section className="rulebook-frame p-8 space-y-6 bg-parchment">
            <h2 className="font-display text-center text-sm font-bold tracking-[0.2em] uppercase text-wax-red border-b border-black/30 pb-4 leading-loose">
              Your seal
            </h2>
            <div className="flex flex-col items-center gap-6 text-center">
              {profile.avatar_url && (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-20 h-20 border-[3px] border-double border-ink object-cover"
                  style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
                />
              )}
              <div className="space-y-2 leading-relaxed w-full min-w-0">
                <p className="font-display font-semibold text-base text-ink truncate">{profile.username}</p>
                <p className="font-display text-sm text-gold-tarnish leading-loose">{profile.rank}</p>
              </div>
              <div className="w-full pt-2 border-t border-black/20">
                <XPBar
                  xp={profile.xp}
                  level={profile.level}
                  xpProgress={profile.xp_progress}
                  xpCurrent={profile.xp_current_level}
                  xpNext={profile.xp_next_level}
                />
              </div>
            </div>
          </section>
        )}

        {stats && (
          <section className="rulebook-frame p-8 space-y-6 bg-parchment">
            <h2 className="font-display text-center text-sm font-bold tracking-[0.2em] uppercase text-wax-red border-b border-black/30 pb-4 leading-loose">
              World tally
            </h2>
            <ul className="flex flex-col gap-6 list-none">
              <LedgerStat icon={<Wifi size={20} strokeWidth={1.75} />} value={stats.total_wifi} label="Wi-Fi networks" color="text-wifi" />
              <LedgerStat icon={<Bluetooth size={20} strokeWidth={1.75} />} value={stats.total_bt} label="BT devices" color="text-bt" />
              <LedgerStat icon={<Radio size={20} strokeWidth={1.75} />} value={stats.total_cell} label="Cell towers" color="text-cell" />
            </ul>
          </section>
        )}

        <section className="rulebook-frame p-8 space-y-6 bg-parchment">
          <h2 className="font-display text-center text-sm font-bold tracking-[0.2em] uppercase text-wax-red border-b border-black/30 pb-4 leading-loose">
            Encryption sigils
          </h2>
          <ul className="flex flex-col gap-5 list-none">
            {encryptions.map((enc) => (
              <li key={enc}>
                <label className="flex items-center gap-4 text-sm cursor-pointer group font-mono leading-relaxed">
                  <input
                    type="checkbox"
                    checked={encryptionFilters[enc] ?? true}
                    onChange={(e) => setEncryptionFilter(enc, e.target.checked)}
                    className="w-4 h-4 accent-wax-red border-2 border-ink rounded-sm shrink-0"
                  />
                  <span className="w-3 h-3 shrink-0 border border-ink" style={{ backgroundColor: encryptionColor(enc) }} />
                  <span className="text-sepia group-hover:text-ink transition-colors break-words">{enc}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>

        <section className="rulebook-frame p-8 space-y-6 bg-parchment">
          <h2 className="font-display text-center text-sm font-bold tracking-[0.2em] uppercase text-wax-red border-b border-black/30 pb-4 leading-loose">
            Veils lifted
          </h2>
          <ul className="flex flex-col gap-4 list-none">
            {isAuthenticated && (
              <li>
                <LeatherToggle active={mineOnly} onClick={toggleMineOnly} label="My networks only" />
              </li>
            )}
            <li>
              <LeatherToggle active={showBtLayer} onClick={toggleBtLayer} label="Bluetooth devices" />
            </li>
            <li>
              <LeatherToggle active={showCellLayer} onClick={toggleCellLayer} label="Cell towers" />
            </li>
          </ul>
        </section>

        <section className="rulebook-frame p-8 space-y-6 bg-parchment border-dashed">
          <h2 className="font-display text-center text-sm font-bold tracking-[0.2em] uppercase text-wax-red border-b border-black/30 pb-4 leading-loose">
            SSID inquiry
          </h2>
          <div className="relative border-2 border-ink bg-[#fdf8ed]">
            <Search size={18} strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 text-sepia pointer-events-none" />
            <input
              type="text"
              value={ssidSearch}
              onChange={(e) => setSsidSearch(e.target.value)}
              placeholder="Network name…"
              className="w-full pl-12 pr-4 py-4 bg-transparent text-sm font-mono text-ink placeholder:text-muted focus:outline-none leading-relaxed"
            />
          </div>
        </section>

        {stats?.top_ssids && stats.top_ssids.length > 0 && (
          <section className="rulebook-frame p-8 space-y-6 bg-parchment pb-10">
            <h2 className="font-display text-center text-sm font-bold tracking-[0.2em] uppercase text-wax-red border-b border-black/30 pb-4 leading-loose">
              Often-seen names
            </h2>
            <ol className="list-decimal list-inside flex flex-col gap-0 marker:font-display marker:text-gold-tarnish">
              {stats.top_ssids.slice(0, 8).map((s, i) => (
                <li
                  key={i}
                  className="ledger-line flex justify-between items-baseline gap-6 py-4 px-2 text-sm leading-loose"
                >
                  <span className="font-mono text-ink truncate min-w-0">{s.ssid || '<hidden>'}</span>
                  <span className="font-mono text-sepia shrink-0 tabular-nums">{formatNumber(s.count)}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </aside>
    </>
  )
}

function LedgerStat({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <li className="ledger-line flex items-center justify-between gap-6 py-5 px-2 first:pt-0">
      <div className="flex items-center gap-4 min-w-0">
        <span className={`shrink-0 ${color} [&_svg]:text-ink`}>{icon}</span>
        <span className="font-display text-sm text-sepia leading-loose">{label}</span>
      </div>
      <span className={`font-mono font-bold text-lg tabular-nums shrink-0 ${color}`}>{formatNumber(value)}</span>
    </li>
  )
}

function LeatherToggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-5 py-4 text-sm font-display font-semibold border-2 transition-all leading-loose ${
        active ? 'leather-tab-active' : 'border-dashed border-transparent text-sepia hover:text-ink hover:border-ink bg-parchment/40'
      }`}
      style={active ? { boxShadow: '3px 3px 0 0 #1a1a1a' } : undefined}
    >
      {label}
    </button>
  )
}
