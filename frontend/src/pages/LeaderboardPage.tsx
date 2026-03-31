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
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="max-w-4xl mx-auto px-8 sm:px-12 lg:px-16 py-12 sm:py-16 space-y-12 sm:space-y-16">
        <header className="text-center space-y-6 max-w-2xl mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wax-red tracking-wide leading-loose border-b border-black/30 pb-8">
            Arena roll call
          </h1>
          <p className="text-sm sm:text-base text-sepia font-sans leading-loose">
            Names chased in ink — ranked by renown or networks sighted.
          </p>
        </header>

        <div className="flex flex-wrap gap-6 justify-center">
          {[
            { key: 'xp', icon: <Star size={18} strokeWidth={1.75} />, label: 'By XP' },
            { key: 'wifi', icon: <Wifi size={18} strokeWidth={1.75} />, label: 'By Wi-Fi' },
          ].map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSortBy(s.key)}
              className={`flex items-center gap-3 px-8 py-4 border-2 text-sm font-display font-semibold transition-colors leading-loose ${
                sortBy === s.key
                  ? 'border-ink bg-[#ebe4d0] text-wax-red'
                  : 'text-sepia border-dashed border-transparent hover:border-ink'
              }`}
              style={sortBy === s.key ? { boxShadow: '3px 3px 0 0 #1a1a1a' } : undefined}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>

        {top3.length >= 3 && (
          <div className="hidden sm:flex items-end justify-center gap-10 lg:gap-14 mb-4">
            <PodiumCard entry={top3[1]} position={2} />
            <PodiumCard entry={top3[0]} position={1} />
            <PodiumCard entry={top3[2]} position={3} />
          </div>
        )}

        <section className="rulebook-frame bg-parchment overflow-hidden">
          {loading ? (
            <div className="py-24 text-center text-sepia font-mono space-y-6 leading-loose">
              <div className="w-8 h-8 border-2 border-ink border-t-transparent animate-spin mx-auto" />
              <p>Reading the rolls…</p>
            </div>
          ) : (
            <ol className="list-none">
              {rest.map((entry, i) => (
                <motion.li
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.012 }}
                  className="ledger-line grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center px-8 sm:px-12 py-10 first:pt-8"
                >
                  <div className="md:col-span-1 font-mono font-bold text-sm text-sepia text-right md:text-right tabular-nums">
                    #{entry.rank}
                  </div>
                  <div className="md:col-span-5 flex items-center gap-6 min-w-0">
                    {entry.avatar_url ? (
                      <img
                        src={entry.avatar_url}
                        alt=""
                        className="w-12 h-12 border-[3px] border-double border-ink object-cover shrink-0"
                        style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
                      />
                    ) : (
                      <div
                        className="w-12 h-12 border-[3px] border-double border-ink bg-[#ebe4d0] flex items-center justify-center font-display font-bold text-sepia shrink-0"
                        style={{ boxShadow: '3px 3px 0 0 #1a1a1a' }}
                      >
                        {entry.username[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 space-y-2 leading-loose">
                      <Link
                        to={`/profile/${entry.user_id}`}
                        className="font-display font-semibold text-base text-ink hover:text-wax-red transition-colors block truncate"
                      >
                        {entry.username}
                      </Link>
                      <p className="text-xs text-muted font-display">{rankTitle(entry.level).name}</p>
                    </div>
                  </div>
                  <div className="md:col-span-3 text-left md:text-right space-y-1 font-mono leading-loose">
                    <p className="font-bold text-sm text-gold-tarnish">Lvl {entry.level}</p>
                    <p className="text-xs text-ink">{formatXP(entry.xp)}</p>
                  </div>
                  <div className="md:col-span-3 hidden md:grid grid-cols-3 gap-4 text-right">
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
    <div className="space-y-1">
      <p className={`font-mono text-sm font-semibold ${color} tabular-nums`}>{formatNumber(value)}</p>
      <p className="text-[10px] text-sepia uppercase tracking-wider">{label}</p>
    </div>
  )
}

function PodiumCard({ entry, position }: { entry: any; position: number }) {
  const cfg = {
    1: { h: 'h-44', border: 'border-ink', bg: 'bg-parchment', text: 'text-gold-tarnish', icon: <Crown size={24} strokeWidth={1.5} /> },
    2: { h: 'h-36', border: 'border-ink', bg: 'bg-[#ebe4d0]', text: 'text-sepia', icon: <Medal size={22} strokeWidth={1.5} /> },
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
          className={`w-16 h-16 ${cfg.bg} border-[3px] ${cfg.border} mb-4 flex items-center justify-center font-display font-bold text-lg text-ink`}
          style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
        >
          {entry.username[0].toUpperCase()}
        </div>
      )}
      <Link to={`/profile/${entry.user_id}`} className="font-display font-semibold text-sm text-ink hover:text-wax-red transition-colors text-center leading-loose">
        {entry.username}
      </Link>
      <p className={`text-xs font-mono font-bold ${cfg.text} leading-loose`}>Lvl {entry.level}</p>
      <p className="text-[11px] font-mono text-ink leading-loose">{formatXP(entry.xp)}</p>
      <div
        className={`${cfg.h} w-24 ${cfg.bg} border-4 border-double ${cfg.border} mt-6 flex items-end justify-center pb-3`}
        style={{ boxShadow: '5px 5px 0 0 #1a1a1a' }}
      >
        <span className={`font-display font-bold text-2xl ${cfg.text}`}>#{position}</span>
      </div>
    </motion.div>
  )
}
