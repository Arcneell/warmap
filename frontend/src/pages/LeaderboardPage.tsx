import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLeaderboard } from '@/api/hooks'
import { Trophy, Wifi, Star, Crown, Medal, Award } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { rankTitle, formatXP } from '@/lib/xp'

export function LeaderboardPage() {
  const [sortBy, setSortBy] = useState('xp')
  const { data: entries, loading } = useLeaderboard(sortBy, 100)

  const top3 = entries?.slice(0, 3) ?? []
  const rest = entries?.slice(3) ?? []

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-2">Arena Rankings</h1>
          <p className="text-sm text-secondary">The greatest wardrivers of all time</p>
        </div>

        {/* Sort tabs */}
        <div className="flex justify-center gap-2 mb-8">
          <SortTab active={sortBy === 'xp'} onClick={() => setSortBy('xp')} icon={<Star size={14} />} label="By XP" />
          <SortTab active={sortBy === 'wifi'} onClick={() => setSortBy('wifi')} icon={<Wifi size={14} />} label="By WiFi" />
        </div>

        {/* Podium - Top 3 */}
        {top3.length >= 3 && (
          <div className="hidden sm:flex items-end justify-center gap-4 mb-10">
            <PodiumCard entry={top3[1]} position={2} />
            <PodiumCard entry={top3[0]} position={1} />
            <PodiumCard entry={top3[2]} position={3} />
          </div>
        )}

        {/* Rankings table */}
        <div className="bg-panel rounded-2xl border border-border overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-secondary">
              <div className="w-6 h-6 border-2 border-wifi/30 border-t-wifi rounded-full animate-spin mx-auto mb-2" />
              Loading rankings...
            </div>
          ) : (
            rest.map((entry, i) => (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-4 px-5 py-3 border-b border-border/50 hover:bg-surface/50 transition-colors"
              >
                <span className="font-mono font-bold text-sm text-muted w-8 text-right">
                  #{entry.rank}
                </span>
                {entry.avatar_url ? (
                  <img src={entry.avatar_url} alt="" className="w-8 h-8 rounded-full border border-border" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-xs font-bold text-secondary">
                    {entry.username[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link to={`/profile/${entry.user_id}`} className="font-semibold text-sm text-primary hover:text-wifi transition-colors">
                    {entry.username}
                  </Link>
                  <div className="text-[10px] text-secondary">{rankTitle(entry.level).name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-legendary">Lvl {entry.level}</div>
                  <div className="font-mono text-[10px] text-xp">{formatXP(entry.xp)} XP</div>
                </div>
                <div className="hidden sm:flex gap-4 text-right">
                  <StatMini label="WiFi" value={entry.wifi_discovered} color="text-wifi" />
                  <StatMini label="BT" value={entry.bt_discovered} color="text-bt" />
                  <StatMini label="Cell" value={entry.cell_discovered} color="text-cell" />
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function PodiumCard({ entry, position }: { entry: any; position: number }) {
  const heights = { 1: 'h-40', 2: 'h-32', 3: 'h-28' }
  const colors = {
    1: { border: 'border-legendary', bg: 'bg-legendary/10', text: 'text-legendary', icon: <Crown size={20} /> },
    2: { border: 'border-[#c0c0c0]', bg: 'bg-[#c0c0c0]/10', text: 'text-[#c0c0c0]', icon: <Medal size={18} /> },
    3: { border: 'border-[#cd7f32]', bg: 'bg-[#cd7f32]/10', text: 'text-[#cd7f32]', icon: <Award size={18} /> },
  }
  const c = colors[position as keyof typeof colors]
  const h = heights[position as keyof typeof heights]

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.15 }}
      className={`flex flex-col items-center ${position === 1 ? 'order-2' : position === 2 ? 'order-1' : 'order-3'}`}
    >
      <div className={`${c.text} mb-2`}>{c.icon}</div>
      {entry.avatar_url ? (
        <img src={entry.avatar_url} alt="" className={`w-14 h-14 rounded-full border-2 ${c.border} mb-2`} />
      ) : (
        <div className={`w-14 h-14 rounded-full bg-surface border-2 ${c.border} mb-2 flex items-center justify-center font-bold text-lg text-secondary`}>
          {entry.username[0].toUpperCase()}
        </div>
      )}
      <Link to={`/profile/${entry.user_id}`} className="font-semibold text-sm text-primary hover:text-wifi transition-colors mb-0.5">
        {entry.username}
      </Link>
      <div className={`text-xs font-mono font-bold ${c.text}`}>Lvl {entry.level}</div>
      <div className="text-[10px] font-mono text-xp">{formatXP(entry.xp)} XP</div>
      <div className={`${h} w-20 ${c.bg} border ${c.border} rounded-t-xl mt-3 flex items-end justify-center pb-2`}>
        <span className={`font-display font-bold text-2xl ${c.text}`}>#{position}</span>
      </div>
    </motion.div>
  )
}

function SortTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
        active ? 'bg-wifi/15 text-wifi border border-wifi/30' : 'text-secondary hover:text-primary border border-transparent'
      }`}
    >
      {icon} {label}
    </button>
  )
}

function StatMini({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className={`font-mono text-xs font-semibold ${color}`}>{formatNumber(value)}</div>
      <div className="text-[9px] text-muted">{label}</div>
    </div>
  )
}
