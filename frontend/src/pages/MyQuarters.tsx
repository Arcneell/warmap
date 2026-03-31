import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useMyProfile, useUserBadges, useUploadHistory } from '@/api/hooks'
import { LevelRing } from '@/components/rpg/LevelRing'
import { XPBar } from '@/components/rpg/XPBar'
import { BadgeCard } from '@/components/rpg/BadgeCard'
import { formatNumber, formatDate, timeAgo } from '@/lib/format'
import { getCategoryLabel } from '@/lib/badges'
import { authFetch, apiFetch } from '@/api/client'
import type { ApiToken } from '@/api/types'
import {
  Shield, Award, ScrollText, Settings, Wifi, Bluetooth, Radio, Upload,
  Key, Plus, Trash2, Copy, CheckCircle, XCircle, Loader2, Clock,
} from 'lucide-react'
import { useEffect } from 'react'

type Tab = 'overview' | 'badges' | 'uploads' | 'settings'

export function MyQuarters() {
  const [tab, setTab] = useState<Tab>('overview')
  const { user } = useAuthStore()
  const { data: profile } = useMyProfile(!!user)
  const { data: badges } = useUserBadges(user?.id)
  const { data: uploads } = useUploadHistory(50, 0, !!user)

  if (!user || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center text-secondary">
        <div className="text-center">
          <Shield size={48} className="mx-auto mb-4 text-muted" />
          <div className="font-display text-xl font-bold mb-2">Quarters Locked</div>
          <div className="text-sm">Login to access your personal quarters</div>
        </div>
      </div>
    )
  }

  const earnedCount = badges?.filter((b) => b.earned).length ?? 0
  const totalCount = badges?.length ?? 0
  const badgesByCategory = groupBy(badges ?? [], 'category')

  const userValues: Record<string, number> = {
    wifi_count: profile.wifi_discovered,
    bt_count: profile.bt_discovered,
    cell_count: profile.cell_discovered,
    upload_count: profile.total_uploads,
    xp: profile.xp,
    level: profile.level,
  }

  const tabs = [
    { key: 'overview' as Tab, icon: <Shield size={14} />, label: 'Overview' },
    { key: 'badges' as Tab, icon: <Award size={14} />, label: `Badges (${earnedCount}/${totalCount})` },
    { key: 'uploads' as Tab, icon: <ScrollText size={14} />, label: 'Quest Log' },
    { key: 'settings' as Tab, icon: <Settings size={14} />, label: 'Settings' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-2">My Quarters</h1>
          <p className="text-sm text-secondary">Your personal command center</p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                tab === t.key ? 'bg-epic/15 text-epic border border-epic/30' : 'text-secondary hover:text-primary border border-transparent'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === 'overview' && (
          <div className="space-y-6">
            {/* Character sheet */}
            <div className="bg-panel rounded-2xl border border-border p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-epic/5 to-transparent" />
              <div className="relative flex flex-col md:flex-row items-center gap-8">
                <LevelRing
                  level={profile.level}
                  xp={profile.xp}
                  xpProgress={profile.xp_progress}
                  size={160}
                  avatarUrl={user.avatar_url}
                />
                <div className="flex-1 text-center md:text-left">
                  <h2 className="font-display text-2xl font-bold text-primary">{user.username}</h2>
                  {profile.global_rank > 0 && (
                    <div className="text-xs font-mono text-legendary mt-1">Global Rank #{profile.global_rank}</div>
                  )}
                  <div className="mt-4 max-w-sm">
                    <XPBar xp={profile.xp} level={profile.level} xpProgress={profile.xp_progress} xpCurrent={profile.xp_current_level} xpNext={profile.xp_next_level} />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={<Wifi size={18} />} value={profile.wifi_discovered} label="WiFi Discovered" color="text-wifi" />
              <StatCard icon={<Bluetooth size={18} />} value={profile.bt_discovered} label="BT Devices" color="text-bt" />
              <StatCard icon={<Radio size={18} />} value={profile.cell_discovered} label="Cell Towers" color="text-cell" />
              <StatCard icon={<Upload size={18} />} value={profile.total_uploads} label="Uploads" color="text-xp" />
            </div>

            {/* Recent badges */}
            {earnedCount > 0 && (
              <div className="bg-panel rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-primary">Recent Badges</h3>
                  <button onClick={() => setTab('badges')} className="text-xs text-wifi hover:underline">
                    View all ({earnedCount})
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {badges?.filter((b) => b.earned).slice(-4).reverse().map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Badges */}
        {tab === 'badges' && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="font-display text-4xl font-bold text-legendary mb-1">
                {earnedCount} / {totalCount}
              </div>
              <div className="text-sm text-secondary">Badges Collected</div>
              <div className="w-48 h-2 bg-void rounded-full overflow-hidden mx-auto mt-3 border border-border">
                <div
                  className="h-full bg-gradient-to-r from-legendary/60 to-legendary rounded-full"
                  style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </div>

            {Object.entries(badgesByCategory).map(([category, categoryBadges]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-xs font-semibold uppercase tracking-widest text-secondary">
                    {getCategoryLabel(category)}
                  </div>
                  <div className="text-[10px] font-mono text-muted">
                    {categoryBadges.filter((b) => b.earned).length}/{categoryBadges.length}
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {categoryBadges.map((badge) => (
                    <BadgeCard
                      key={badge.id}
                      badge={badge}
                      showProgress
                      currentValue={userValues[badge.criteria_type] ?? 0}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Uploads / Quest log */}
        {tab === 'uploads' && (
          <div className="space-y-3">
            {!uploads || uploads.length === 0 ? (
              <div className="text-center py-16 text-secondary">
                <ScrollText size={48} className="mx-auto mb-4 text-muted" />
                <div className="font-display text-lg font-bold mb-2">No Quests Yet</div>
                <div className="text-sm">Upload your first wardriving capture to begin</div>
              </div>
            ) : (
              uploads.map((tx) => (
                <div key={tx.id} className="bg-panel rounded-xl border border-border p-4 flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4">
                  <StatusIcon status={tx.status} />
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-semibold text-primary truncate">{tx.filename}</div>
                    <div className="text-[10px] text-secondary mt-0.5">
                      {timeAgo(tx.uploaded_at)}
                      {tx.file_format && <span className="ml-2 text-muted">{tx.file_format}</span>}
                    </div>
                  </div>
                  {tx.status === 'done' && (
                    <div className="flex gap-3 sm:gap-4 text-right">
                      <MiniStat label="New" value={tx.new_networks} color="text-xp" />
                      <MiniStat label="Updated" value={tx.updated_networks} color="text-wifi" />
                      <MiniStat label="XP" value={tx.xp_earned} color="text-legendary" />
                    </div>
                  )}
                  {tx.status === 'error' && (
                    <span className="text-xs text-danger">{tx.status_message ?? 'Failed'}</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Settings */}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}

function SettingsTab() {
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [newTokenName, setNewTokenName] = useState('')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadTokens = async () => {
    try {
      const res = await authFetch('/auth/tokens')
      if (res.ok) setTokens(await res.json())
    } catch {}
  }

  useEffect(() => { loadTokens() }, [])

  const createToken = async () => {
    if (!newTokenName.trim()) return
    setLoading(true)
    try {
      const data = await apiFetch<ApiToken>('/auth/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTokenName }),
      })
      setNewToken(data.token ?? null)
      setNewTokenName('')
      loadTokens()
    } catch {} finally { setLoading(false) }
  }

  const revokeToken = async (id: number) => {
    try {
      await authFetch(`/auth/tokens/${id}`, { method: 'DELETE' })
      loadTokens()
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="bg-panel rounded-2xl border border-border p-6">
        <h3 className="font-semibold text-primary mb-4 flex items-center gap-2">
          <Key size={16} className="text-wifi" /> API Tokens
        </h3>

        {/* Create */}
        <div className="flex gap-2 mb-4">
          <input
            value={newTokenName}
            onChange={(e) => setNewTokenName(e.target.value)}
            placeholder="Token name..."
            className="flex-1 px-3 py-2 bg-surface border border-border rounded-lg text-xs font-mono text-primary placeholder:text-muted focus:border-wifi focus:outline-none"
          />
          <button
            onClick={createToken}
            disabled={!newTokenName.trim() || loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-wifi/15 text-wifi border border-wifi/30 hover:bg-wifi/25 disabled:opacity-30 transition-all"
          >
            <Plus size={14} /> Create
          </button>
        </div>

        {/* New token display */}
        {newToken && (
          <div className="bg-xp/10 border border-xp/30 rounded-lg p-3 mb-4">
            <div className="text-[10px] font-semibold text-xp mb-1">New token created — copy it now, it won't be shown again!</div>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs text-primary bg-void px-2 py-1 rounded break-all">{newToken}</code>
              <button
                onClick={() => navigator.clipboard.writeText(newToken)}
                className="p-1.5 text-secondary hover:text-primary"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Token list */}
        <div className="space-y-2">
          {tokens.length === 0 ? (
            <div className="text-xs text-secondary py-4 text-center">No API tokens yet</div>
          ) : (
            tokens.map((t) => (
              <div key={t.id} className="flex items-center justify-between bg-surface rounded-lg px-3 py-2 border border-border">
                <div>
                  <div className={`text-xs font-semibold ${t.revoked ? 'text-muted line-through' : 'text-primary'}`}>{t.name}</div>
                  <div className="text-[10px] text-muted">Created {formatDate(t.created_at)}</div>
                </div>
                {t.revoked ? (
                  <span className="text-[10px] text-muted">Revoked</span>
                ) : (
                  <button onClick={() => revokeToken(t.id)} className="text-danger hover:text-danger/80 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="bg-panel rounded-2xl border border-border p-4 text-center">
      <div className={`${color} mb-1 flex justify-center`}>{icon}</div>
      <div className={`font-mono font-bold text-xl ${color}`}>{formatNumber(value)}</div>
      <div className="text-[10px] text-secondary">{label}</div>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'done': return <CheckCircle size={20} className="text-xp flex-shrink-0" />
    case 'error': return <XCircle size={20} className="text-danger flex-shrink-0" />
    case 'pending': return <Clock size={20} className="text-secondary flex-shrink-0" />
    default: return <Loader2 size={20} className="text-wifi flex-shrink-0 animate-spin" />
  }
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`font-mono text-xs font-semibold ${color}`}>{formatNumber(value)}</div>
      <div className="text-[9px] text-muted">{label}</div>
    </div>
  )
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key])
    ;(acc[k] ??= []).push(item)
    return acc
  }, {} as Record<string, T[]>)
}
