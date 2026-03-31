import { useParams } from 'react-router-dom'
import { useUserProfile, useUserBadges } from '@/api/hooks'
import { LevelRing } from '@/components/rpg/LevelRing'
import { BadgeCard } from '@/components/rpg/BadgeCard'
import { formatNumber, formatDate } from '@/lib/format'
import { getCategoryLabel } from '@/lib/badges'
import { Wifi, Bluetooth, Radio, Upload, Calendar } from 'lucide-react'

export function ProfilePage() {
  const { userId } = useParams()
  const { data: profile, loading } = useUserProfile(userId)
  const { data: badges } = useUserBadges(profile?.user_id)

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-8 h-8 border-2 border-ink border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-sepia text-base font-mono leading-loose">
        Player not found
      </div>
    )
  }

  const earnedBadges = badges?.filter((b) => b.earned) ?? []
  const badgesByCategory = groupBy(badges ?? [], 'category')

  const statRows = [
    { icon: <Wifi size={20} strokeWidth={1.75} />, label: 'Wi-Fi networks charted', value: profile.wifi_discovered, color: 'text-wifi' },
    { icon: <Bluetooth size={20} strokeWidth={1.75} />, label: 'Bluetooth signatures', value: profile.bt_discovered, color: 'text-bt' },
    { icon: <Radio size={20} strokeWidth={1.75} />, label: 'Cell towers logged', value: profile.cell_discovered, color: 'text-cell' },
    { icon: <Upload size={20} strokeWidth={1.75} />, label: 'Scrolls filed', value: profile.total_uploads, color: 'text-ink' },
  ]

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="max-w-3xl mx-auto px-8 sm:px-12 lg:px-16 py-12 sm:py-16 space-y-12 sm:space-y-16">
        <section className="rulebook-frame p-10 sm:p-12 lg:p-16 bg-parchment text-center space-y-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wax-red tracking-wide leading-loose border-b border-black/30 pb-8 max-w-xl mx-auto">
            Operator&apos;s folio
          </h1>
          <div className="flex flex-col items-center gap-8">
            <LevelRing level={profile.level} xp={profile.xp} xpProgress={profile.xp_progress} size={140} avatarUrl={profile.avatar_url} />
            <div className="space-y-3 leading-loose">
              <h2 className="font-display text-2xl font-bold text-ink border-b border-black/20 pb-4 inline-block min-w-[12rem]">
                {profile.username}
              </h2>
              {profile.global_rank > 0 && (
                <p className="text-sm font-mono text-gold-tarnish leading-loose">
                  World rank #{profile.global_rank}
                </p>
              )}
              {profile.created_at && (
                <p className="flex items-center justify-center gap-2 text-xs text-sepia font-mono leading-loose">
                  <Calendar size={14} strokeWidth={1.75} /> Joined {formatDate(profile.created_at)}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="rulebook-frame p-10 sm:p-12 bg-parchment space-y-8">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-ink text-center leading-loose border-b border-black/30 pb-6">
            Deeds ledger
          </h2>
          <ul className="list-none flex flex-col">
            {statRows.map((row) => (
              <li key={row.label} className="ledger-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-8 px-2 first:pt-2">
                <div className="flex items-center gap-5 min-w-0">
                  <span className={`shrink-0 ${row.color} [&_svg]:text-ink`}>{row.icon}</span>
                  <span className="font-display text-sm sm:text-base text-sepia leading-loose text-left">{row.label}</span>
                </div>
                <span className={`font-mono font-bold text-xl tabular-nums text-right shrink-0 ${row.color}`}>
                  {formatNumber(row.value)}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {earnedBadges.length > 0 && (
          <section className="rulebook-frame p-10 sm:p-12 lg:p-14 bg-parchment space-y-10">
            <header className="text-center space-y-4 border-b border-black/30 pb-8">
              <h2 className="font-display text-2xl font-bold text-wax-red leading-loose">Hall of seals</h2>
              <p className="font-mono text-sm text-sepia leading-loose">
                {earnedBadges.length} badges earned
              </p>
            </header>
            {Object.entries(badgesByCategory).map(([category, categoryBadges]) => {
              const earned = categoryBadges.filter((b) => b.earned)
              if (earned.length === 0) return null
              return (
                <div key={category} className="space-y-8">
                  <h3 className="font-display text-center text-sm font-bold uppercase tracking-[0.25em] text-gold-tarnish border-b border-black/20 pb-4 leading-loose">
                    {getCategoryLabel(category)}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-10">
                    {earned.map((badge) => (
                      <BadgeCard key={badge.id} badge={badge} />
                    ))}
                  </div>
                </div>
              )
            })}
          </section>
        )}
      </div>
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
