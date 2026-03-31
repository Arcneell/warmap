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
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-wifi/30 border-t-wifi rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center text-secondary">
        Player not found
      </div>
    )
  }

  const earnedBadges = badges?.filter((b) => b.earned) ?? []
  const badgesByCategory = groupBy(badges ?? [], 'category')

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Hero */}
        <div className="bg-panel rounded-2xl border border-border p-8 mb-6 text-center relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-epic/5 to-transparent" />

          <div className="relative">
            <LevelRing
              level={profile.level}
              xp={profile.xp}
              xpProgress={profile.xp_progress}
              size={140}
              avatarUrl={profile.avatar_url}
            />

            <h2 className="font-display text-2xl font-bold text-primary mt-4">{profile.username}</h2>

            {profile.global_rank > 0 && (
              <div className="text-xs font-mono text-legendary mt-1">
                Global Rank #{profile.global_rank}
              </div>
            )}

            {profile.created_at && (
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted mt-2">
                <Calendar size={10} />
                Joined {formatDate(profile.created_at)}
              </div>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Wifi size={18} />} value={profile.wifi_discovered} label="WiFi" color="text-wifi" />
          <StatCard icon={<Bluetooth size={18} />} value={profile.bt_discovered} label="Bluetooth" color="text-bt" />
          <StatCard icon={<Radio size={18} />} value={profile.cell_discovered} label="Cell Towers" color="text-cell" />
          <StatCard icon={<Upload size={18} />} value={profile.total_uploads} label="Uploads" color="text-xp" />
        </div>

        {/* Badges */}
        {earnedBadges.length > 0 && (
          <div className="bg-panel rounded-2xl border border-border p-6">
            <h3 className="font-display text-lg font-bold text-primary mb-1">Trophy Room</h3>
            <p className="text-xs text-secondary mb-6">
              {earnedBadges.length} badge{earnedBadges.length !== 1 ? 's' : ''} earned
            </p>

            {Object.entries(badgesByCategory).map(([category, categoryBadges]) => {
              const earned = categoryBadges.filter((b) => b.earned)
              if (earned.length === 0) return null
              return (
                <div key={category} className="mb-6 last:mb-0">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-secondary mb-3">
                    {getCategoryLabel(category)}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {earned.map((badge) => (
                      <BadgeCard key={badge.id} badge={badge} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
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

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key])
    ;(acc[k] ??= []).push(item)
    return acc
  }, {} as Record<string, T[]>)
}
