import { useAuthStore } from '@/stores/authStore'
import { useMapStore } from '@/stores/mapStore'
import { useUIStore } from '@/stores/uiStore'
import { useMyProfile, useGlobalStats } from '@/api/hooks'
import { XPBar } from '@/components/rpg/XPBar'
import { formatNumber, encryptionColor } from '@/lib/format'
import {
  Wifi, Bluetooth, Radio, X, Search,
} from 'lucide-react'
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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        w-80 flex-shrink-0 bg-panel border-r border-border overflow-y-auto
        flex flex-col gap-3 p-3
        fixed top-14 bottom-0 z-40 transition-transform duration-300
        lg:relative lg:top-0 lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Close on mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden self-end p-1 text-secondary hover:text-primary"
        >
          <X size={18} />
        </button>

        {/* Profile card */}
        {isAuthenticated && profile && (
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3 mb-3">
              {profile.avatar_url && (
                <img src={profile.avatar_url} alt="" className="w-10 h-10 rounded-full border-2 border-epic/50" />
              )}
              <div>
                <div className="font-mono font-bold text-sm">{profile.username}</div>
                <div className="text-xs text-xp font-semibold">{profile.rank}</div>
              </div>
            </div>
            <XPBar
              xp={profile.xp}
              level={profile.level}
              xpProgress={profile.xp_progress}
              xpCurrent={profile.xp_current_level}
              xpNext={profile.xp_next_level}
            />
          </div>
        )}

        {/* Global stats */}
        {stats && (
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-secondary mb-3">
              World Status
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatBox icon={<Wifi size={14} />} value={stats.total_wifi} label="WiFi" color="text-wifi" />
              <StatBox icon={<Bluetooth size={14} />} value={stats.total_bt} label="BT" color="text-bt" />
              <StatBox icon={<Radio size={14} />} value={stats.total_cell} label="Cell" color="text-cell" />
            </div>
          </div>
        )}

        {/* Encryption filters */}
        <div className="bg-surface rounded-xl p-4 border border-border">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-secondary mb-3">
            Encryption Filter
          </div>
          <div className="flex flex-col gap-2">
            {encryptions.map((enc) => (
              <label key={enc} className="flex items-center gap-2 text-xs cursor-pointer group">
                <input
                  type="checkbox"
                  checked={encryptionFilters[enc] ?? true}
                  onChange={(e) => setEncryptionFilter(enc, e.target.checked)}
                  className="accent-wifi"
                />
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: encryptionColor(enc) }}
                />
                <span className="text-secondary group-hover:text-primary transition-colors">{enc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Layer toggles */}
        <div className="bg-surface rounded-xl p-4 border border-border">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-secondary mb-3">
            Layers
          </div>
          <div className="flex flex-col gap-2">
            {isAuthenticated && (
              <ToggleButton active={mineOnly} onClick={toggleMineOnly} label="My Networks Only" />
            )}
            <ToggleButton active={showBtLayer} onClick={toggleBtLayer} label="Bluetooth Devices" />
            <ToggleButton active={showCellLayer} onClick={toggleCellLayer} label="Cell Towers" />
          </div>
        </div>

        {/* SSID search */}
        <div className="bg-surface rounded-xl p-4 border border-border">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-secondary mb-3">
            SSID Search
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={ssidSearch}
              onChange={(e) => setSsidSearch(e.target.value)}
              placeholder="Search networks..."
              className="w-full pl-9 pr-3 py-2 bg-panel border border-border rounded-lg text-xs font-mono text-primary placeholder:text-muted focus:border-wifi focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Top SSIDs */}
        {stats?.top_ssids && stats.top_ssids.length > 0 && (
          <div className="bg-surface rounded-xl p-4 border border-border">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-secondary mb-3">
              Top SSIDs
            </div>
            <div className="flex flex-col gap-1">
              {stats.top_ssids.slice(0, 8).map((s, i) => (
                <div key={i} className="flex justify-between items-center text-xs py-1">
                  <span className="font-mono text-primary truncate max-w-[180px]">{s.ssid || '<hidden>'}</span>
                  <span className="font-mono text-secondary flex-shrink-0">{formatNumber(s.count)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}

function StatBox({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`${color} mb-1 flex justify-center`}>{icon}</div>
      <div className={`font-mono font-bold text-lg ${color}`}>{formatNumber(value)}</div>
      <div className="text-[10px] text-secondary">{label}</div>
    </div>
  )
}

function ToggleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
        active
          ? 'bg-wifi/15 text-wifi border border-wifi/30'
          : 'text-secondary hover:text-primary hover:bg-panel border border-transparent'
      }`}
    >
      {label}
    </button>
  )
}
