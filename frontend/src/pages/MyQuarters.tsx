import { useState, useEffect } from 'react'
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

type Tab = 'overview' | 'badges' | 'uploads' | 'settings'

export function MyQuarters() {
  const [tab, setTab] = useState<Tab>('overview')
  const { user } = useAuthStore()
  const { data: profile } = useMyProfile(!!user)
  const { data: badges } = useUserBadges(user?.id)
  const { data: uploads } = useUploadHistory(50, 0, !!user)

  if (!user || !profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-16">
        <div className="rulebook-frame bg-parchment px-14 py-16 max-w-md text-center space-y-6">
          <Shield size={44} strokeWidth={1.5} className="mx-auto text-wax-red" />
          <h1 className="font-display text-xl font-bold text-ink leading-loose border-b border-black/30 pb-6">
            Quarters locked
          </h1>
          <p className="text-sm font-mono text-sepia leading-loose">
            Sign the ledger to open your personal hall.
          </p>
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

  const statRows = [
    { icon: <Wifi size={20} strokeWidth={1.75} />, label: 'Wi-Fi charted', value: profile.wifi_discovered, color: 'text-wifi' },
    { icon: <Bluetooth size={20} strokeWidth={1.75} />, label: 'Bluetooth', value: profile.bt_discovered, color: 'text-bt' },
    { icon: <Radio size={20} strokeWidth={1.75} />, label: 'Cell towers', value: profile.cell_discovered, color: 'text-cell' },
    { icon: <Upload size={20} strokeWidth={1.75} />, label: 'Uploads', value: profile.total_uploads, color: 'text-ink' },
  ]

  const tabs: Array<{ key: Tab; icon: React.ReactNode; label: string }> = [
    { key: 'overview', icon: <Shield size={18} strokeWidth={1.75} />, label: 'Overview' },
    { key: 'badges', icon: <Award size={18} strokeWidth={1.75} />, label: `Badges (${earnedCount}/${totalCount})` },
    { key: 'uploads', icon: <ScrollText size={18} strokeWidth={1.75} />, label: 'Quest log' },
    { key: 'settings', icon: <Settings size={18} strokeWidth={1.75} />, label: 'Seals & keys' },
  ]

  return (
    <div className="flex-1 min-h-0">
      <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
        <header className="text-center space-y-2">
          <h1 className="font-display text-3xl font-bold text-wax-red tracking-wide">My Quarters</h1>
          <p className="text-base text-sepia">Your chapter house — rank, spoils, quests, and API seals.</p>
        </header>

        <nav className="flex flex-wrap gap-3 justify-center" aria-label="Quarters sections" role="tablist">
          {tabs.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              role="tab"
              aria-selected={tab === t.key}
              aria-pressed={tab === t.key}
              className={`btn-parchment text-sm ${tab === t.key ? 'active' : ''}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </nav>

        {tab === 'overview' && (
          <div className="space-y-6">
            <section className="rulebook-frame bg-parchment p-6">
              <div className="flex flex-row items-center gap-14">
                <div className="shrink-0">
                  <LevelRing level={profile.level} xp={profile.xp} xpProgress={profile.xp_progress} size={150} avatarUrl={user.avatar_url} />
                </div>
                <div className="flex-1 text-left space-y-8 w-full min-w-0">
                  <div className="space-y-3">
                    <h2 className="font-display text-2xl font-bold text-ink border-b border-black/25 pb-4 block leading-loose">
                      {user.username}
                    </h2>
                    {profile.global_rank > 0 && (
                      <p className="text-sm font-mono text-gold-tarnish leading-loose">
                        World rank #{profile.global_rank}
                      </p>
                    )}
                  </div>
                  <div className="max-w-xl mx-0 pt-2">
                    <XPBar xp={profile.xp} level={profile.level} xpProgress={profile.xp_progress} xpCurrent={profile.xp_current_level} xpNext={profile.xp_next_level} />
                  </div>
                </div>
              </div>
            </section>

            <section className="rulebook-frame bg-parchment p-6">
              <h2 className="font-display text-center text-xl font-bold text-ink leading-loose border-b border-black/30 pb-8 mb-2">
                Field counts
              </h2>
              <ul className="list-none flex flex-col">
                {statRows.map((row) => (
                  <li
                    key={row.label}
                    className="ledger-line flex flex-row items-center justify-between gap-4 py-8 px-2 first:pt-6"
                  >
                    <div className="flex items-center gap-5 min-w-0">
                      <span className={`shrink-0 ${row.color} [&_svg]:text-ink`}>{row.icon}</span>
                      <span className="font-display text-base text-sepia leading-loose">{row.label}</span>
                    </div>
                    <span className={`font-mono font-bold text-xl tabular-nums shrink-0 ${row.color}`}>
                      {formatNumber(row.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {earnedCount > 0 && (
              <section className="rulebook-frame bg-parchment p-6 space-y-8">
                <header className="flex flex-row items-end justify-between gap-4 border-b border-black/30 pb-8">
                  <h2 className="font-display text-xl font-bold text-wax-red text-left leading-loose">
                    Recent seals
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTab('badges')}
                    className="text-sm font-mono text-gold-tarnish hover:text-wax-red border-b border-dashed border-transparent hover:border-ink transition-colors shrink-0"
                  >
                    View full trophy room
                  </button>
                </header>
                <div className="grid grid-cols-2 gap-10">
                  {badges?.filter((b) => b.earned).slice(-4).reverse().map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {tab === 'badges' && (
          <div className="space-y-14">
            <section className="rulebook-frame bg-parchment p-6 text-center space-y-8">
              <h2 className="font-display text-5xl font-bold text-gold-tarnish tabular-nums leading-loose border-b border-black/25 pb-8 inline-block min-w-[12rem]">
                {earnedCount} / {totalCount}
              </h2>
              <p className="text-sm text-sepia font-mono leading-loose">Badges collected</p>
              <div className="h-4 border-[3px] border-ink bg-parchment overflow-hidden max-w-md mx-auto" style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}>
                <div
                  className="h-full bg-ink border-r-2 border-gold-tarnish/40 transition-all duration-500"
                  style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            </section>

            {Object.entries(badgesByCategory).map(([category, categoryBadges]) => (
              <section key={category} className="space-y-8">
                <header className="text-center space-y-3 border-b border-black/20 pb-6">
                  <h3 className="font-display text-sm font-bold uppercase tracking-[0.25em] text-gold-tarnish leading-loose">
                    {getCategoryLabel(category)}
                  </h3>
                  <p className="font-mono text-xs text-sepia tabular-nums">
                    {categoryBadges.filter((b) => b.earned).length} / {categoryBadges.length} earned
                  </p>
                </header>
                <div className="grid grid-cols-3 gap-10">
                  {categoryBadges.map((badge) => (
                    <BadgeCard key={badge.id} badge={badge} showProgress currentValue={userValues[badge.criteria_type] ?? 0} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {tab === 'uploads' && (
          <div className="space-y-6">
            {!uploads || uploads.length === 0 ? (
              <div className="rulebook-frame bg-parchment px-10 py-20 text-center space-y-6">
                <ScrollText size={40} strokeWidth={1.5} className="mx-auto text-muted" />
                <h2 className="font-display text-xl font-bold text-ink leading-loose border-b border-black/25 pb-6 max-w-sm mx-auto">
                  No quests yet
                </h2>
                <p className="text-base font-mono text-sepia leading-loose max-w-md mx-auto">
                  Upload your first capture to ink the first line of the quest log.
                </p>
              </div>
            ) : (
              <ul className="list-none flex flex-col gap-6">
                {uploads.map((tx) => (
                  <li
                    key={tx.id}
                    className="rulebook-frame bg-parchment p-10 flex flex-row items-center gap-10"
                  >
                    <div className="flex items-start gap-5 min-w-0 flex-1">
                      <StatusIcon status={tx.status} />
                      <div className="min-w-0 space-y-3">
                        <p className="font-mono text-base font-semibold text-ink truncate leading-relaxed">{tx.filename}</p>
                        <p className="text-sm text-sepia font-sans leading-loose">
                          {timeAgo(tx.uploaded_at)}
                          {tx.file_format && <span className="ml-2 opacity-80">{tx.file_format}</span>}
                        </p>
                      </div>
                    </div>
                    {tx.status === 'done' && (
                      <div className="flex flex-wrap gap-10 justify-end shrink-0">
                        <MiniStat label="New" value={tx.new_networks} color="text-ink" />
                        <MiniStat label="Updated" value={tx.updated_networks} color="text-wifi" />
                        <MiniStat label="XP" value={tx.xp_earned} color="text-gold-tarnish" />
                      </div>
                    )}
                    {tx.status === 'error' && (
                      <p className="text-sm text-wax-red font-mono leading-loose shrink-0">{tx.status_message ?? 'Failed'}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

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
    <section className="rulebook-frame bg-parchment p-6 space-y-10">
      <header className="text-center space-y-4 border-b border-black/30 pb-8">
        <div className="flex justify-center text-wax-red">
          <Key size={22} strokeWidth={1.75} />
        </div>
        <h2 className="font-display text-2xl font-bold text-wax-red tracking-wide leading-loose px-4">
          API tokens
        </h2>
        <p className="text-base text-gray-800 font-sans leading-relaxed max-w-lg mx-auto">
          Keys cut for scripts and rigs. Copy once; the vault forgets the plain text.
        </p>
      </header>

      <div className="flex flex-row gap-5">
        <label htmlFor="new-token-name" className="sr-only">Token name</label>
        <input
          id="new-token-name"
          value={newTokenName}
          onChange={(e) => setNewTokenName(e.target.value)}
          placeholder="Name for this key…"
          className="flex-1 min-w-0 px-5 py-4 border-2 border-ink bg-[#fdf8ed] text-base font-mono text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-wax-red leading-relaxed"
        />
        <button
          type="button"
          onClick={createToken}
          disabled={!newTokenName.trim() || loading}
          className="flex items-center justify-center gap-2 px-8 py-3 min-h-[3.25rem] border-2 border-ink bg-[#ebe4d0] text-base font-display font-bold text-gray-900 hover:text-wax-red disabled:opacity-25 transition-colors shrink-0 leading-relaxed"
          style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
        >
          <Plus size={18} strokeWidth={1.75} /> Mint key
        </button>
      </div>

      {newToken && (
        <div className="border-2 border-dashed border-ink bg-[#fdf8ed] p-8 space-y-4">
          <p className="text-sm font-display font-semibold text-wax-red leading-loose text-left">
            Copy now — it will not be shown again.
          </p>
          <div className="flex flex-row items-center gap-3">
            <code className="flex-1 font-mono text-sm text-ink bg-[#ebe4d0] px-4 py-3 border border-ink/30 break-all leading-relaxed">
              {newToken}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(newToken)}
              className="p-4 border-2 border-transparent text-sepia hover:text-ink hover:border-dashed hover:border-ink shrink-0"
              aria-label="Copy token"
            >
              <Copy size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}

      <ul className="list-none flex flex-col gap-4">
        {tokens.length === 0 ? (
          <li className="text-center text-sm text-muted py-10 font-mono leading-loose">No keys forged yet.</li>
        ) : (
          tokens.map((t) => (
            <li
              key={t.id}
              className="ledger-line flex flex-row items-center justify-between gap-4 py-6 px-4 border-2 border-ink/30 bg-[#fdf8ed]"
            >
              <div className="space-y-2 min-w-0">
                <p className={`text-base font-display font-semibold leading-relaxed ${t.revoked ? 'text-muted line-through' : 'text-ink'}`}>
                  {t.name}
                </p>
                <p className="text-xs text-sepia font-mono leading-loose">Forged {formatDate(t.created_at)}</p>
              </div>
              {t.revoked ? (
                <span className="text-xs text-muted font-mono">Revoked</span>
              ) : (
                <button
                  type="button"
                  onClick={() => revokeToken(t.id)}
                  className="text-wax-red/90 hover:text-wax-red transition-colors p-2 self-center"
                  title="Revoke"
                >
                  <Trash2 size={18} strokeWidth={1.75} />
                </button>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  )
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'done':
      return <CheckCircle size={22} strokeWidth={1.75} className="text-ink flex-shrink-0" />
    case 'error':
      return <XCircle size={22} strokeWidth={1.75} className="text-wax-red flex-shrink-0" />
    case 'pending':
      return <Clock size={22} strokeWidth={1.75} className="text-sepia flex-shrink-0" />
    default:
      return <Loader2 size={22} strokeWidth={1.75} className="text-ink flex-shrink-0 animate-spin" />
  }
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-right space-y-1">
      <p className={`font-mono text-sm font-semibold tabular-nums ${color}`}>{formatNumber(value)}</p>
      <p className="text-[10px] text-sepia uppercase tracking-wider leading-loose">{label}</p>
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
