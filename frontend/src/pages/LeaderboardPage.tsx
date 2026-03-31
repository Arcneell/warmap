import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useLeaderboard } from '@/api/hooks'
import { Wifi, Star, Crown, Medal, Award } from 'lucide-react'
import { formatNumber } from '@/lib/format'
import { rankTitle, formatXP } from '@/lib/xp'

export function LeaderboardPage() {
  const [sortBy, setSortBy] = useState('xp')
  const { data: entries, loading } = useLeaderboard(sortBy, 100)
  const top3 = entries?.slice(0, 3) ?? []
  const rest = entries?.slice(3) ?? []

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6">
        <header className="text-center space-y-2">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-wax-red tracking-wide">Arena Rankings</h1>
          <p className="text-sm text-sepia">Names etched in ink — ranked by renown or networks sighted.</p>
        </header>

        <div className="flex justify-center gap-2">
          {[
            { key: 'xp', icon: <Star size={16} strokeWidth={1.75} />, label: 'By XP' },
            { key: 'wifi', icon: <Wifi size={16} strokeWidth={1.75} />, label: 'By WiFi' },
          ].map((s) => (
            <button key={s.key} type="button" onClick={() => setSortBy(s.key)}
              className={`btn-parchment text-sm ${sortBy === s.key ? 'active' : ''}`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {top3.length >= 3 && (
          <div className="hidden sm:flex w-full items-end justify-center gap-10 lg:gap-14 mb-4">
            <PodiumCard entry={top3[1]} position={2} />
            <PodiumCard entry={top3[0]} position={1} />
            <PodiumCard entry={top3[2]} position={3} />
          </div>
        )}

        <section className="rulebook-frame bg-parchment overflow-hidden">
          {loading ? (
            <div className="py-24 text-center text-gray-800 font-mono space-y-6 leading-relaxed text-base">
              <div className="w-8 h-8 border-2 border-ink border-t-transparent animate-spin mx-auto" />
              <p>Reading the rolls…</p>
            </div>
          ) : (
            <ol className="list-none w-full">
              {rest.map((entry, i) => (
                <motion.li
                  key={entry.user_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.01 }}
                  className="ledger-line flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4"
                >
                  <span className="font-mono text-sm font-bold tabular-nums text-sepia w-8 text-right shrink-0">
                    #{entry.rank}
                  </span>
                  {entry.avatar_url ? (
                    <img src={entry.avatar_url} alt="" className="h-8 w-8 shrink-0 border-2 border-ink object-cover" style={{ boxShadow: '2px 2px 0 0 #1a1a1a' }} />
                  ) : (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink bg-[#ebe4d0] font-display font-bold text-xs text-sepia" style={{ boxShadow: '2px 2px 0 0 #1a1a1a' }}>
                      {entry.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link to={`/profile/${entry.user_id}`} className="block truncate font-display text-sm font-semibold text-ink hover:text-wax-red transition-colors">
                      {entry.username}
                    </Link>
                    <p className="font-display text-xs text-sepia">{rankTitle(entry.level).name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono text-sm font-bold text-gold-tarnish">Lvl {entry.level}</p>
                    <p className="font-mono text-xs text-sepia">{formatXP(entry.xp)}</p>
                  </div>
                  <div className="hidden md:flex gap-4 shrink-0">
                    <LedgerMiniStat label="WiFi" value={entry.wifi_discovered} color="text-wifi" />
                    <LedgerMiniStat label="BT" value={entry.bt_discovered} color="text-bt" />
                    <LedgerMiniStat label="Cell" value={entry.cell_discovered} color="text-cell" />
                  </div>
                </motion.li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

function LedgerMiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`font-mono text-xs font-semibold ${color} tabular-nums`}>{formatNumber(value)}</p>
      <p className="text-[9px] uppercase tracking-wider text-sepia">{label}</p>
    </div>
  )
}

function PodiumCard({ entry, position }: { entry: any; position: number }) {
  const cfg = {
    1: { h: 'h-44', border: 'border-ink', bg: 'bg-parchment', text: 'text-gold-tarnish', icon: <Crown size={24} strokeWidth={1.5} /> },
    2: { h: 'h-36', border: 'border-ink', bg: 'bg-[#ebe4d0]', text: 'text-gray-800', icon: <Medal size={22} strokeWidth={1.5} /> },
    3: { h: 'h-32', border: 'border-ink', bg: 'bg-[#e8dfd0]', text: 'text-wax-red', icon: <Award size={22} strokeWidth={1.5} /> },
  }[position]!

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.1 }}
      className={`flex flex-col items-center ${position === 1 ? 'order-2' : position === 2 ? 'order-1' : 'order-3'}`}
    >
      <div className={`${cfg.text} mb-4`}>{cfg.icon}</div>
      {entry.avatar_url ? (
        <img
          src={entry.avatar_url}
          alt=""
          className="w-16 h-16 border-[3px] border-double border-ink mb-4 object-cover"
          style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
        />
      ) : (
        <div
          className={`w-16 h-16 ${cfg.bg} border-[3px] ${cfg.border} mb-4 flex items-center justify-center font-display font-bold text-lg text-gray-900`}
          style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
        >
          {entry.username[0].toUpperCase()}
        </div>
      )}
      <Link to={`/profile/${entry.user_id}`} className="font-display font-semibold text-base text-gray-900 hover:text-wax-red transition-colors text-center leading-relaxed">
        {entry.username}
      </Link>
      <p className={`text-sm font-mono font-bold ${cfg.text} leading-relaxed`}>Lvl {entry.level}</p>
      <p className="text-sm font-mono text-gray-900 leading-relaxed">{formatXP(entry.xp)}</p>
      <div
        className={`${cfg.h} w-24 ${cfg.bg} border-4 border-double ${cfg.border} mt-6 flex items-end justify-center pb-3`}
        style={{ boxShadow: '5px 5px 0 0 #1a1a1a' }}
      >
        <span className={`font-display font-bold text-2xl ${cfg.text}`}>#{position}</span>
      </div>
    </motion.div>
  )
}
