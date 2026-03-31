import { formatXP } from '@/lib/xp'

interface XPBarProps {
  xp: number
  level: number
  xpProgress: number
  xpCurrent: number
  xpNext: number
  compact?: boolean
}

export function XPBar({ xp, level, xpProgress, xpCurrent, xpNext, compact }: XPBarProps) {
  const pct = Math.min(100, Math.max(0, xpProgress * 100))
  const toNext = Math.max(0, xpNext - xp)

  if (compact) {
    return (
      <div className="w-full space-y-2 text-center">
        <div className="font-mono text-[10px] text-sepia tracking-wide leading-loose">
          Lvl {level} — {formatXP(xpCurrent)} / {formatXP(xpNext)} XP
        </div>
        <div
          className="h-2 border-[3px] border-ink bg-parchment overflow-hidden mx-auto max-w-[12rem]"
          style={{ boxShadow: 'inset 2px 2px 0 rgba(26,26,26,0.08)' }}
        >
          <div
            className="h-full bg-ink border-r-2 border-wax-red/35"
            style={{ width: `${pct}%`, transition: 'width 0.7s ease' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center gap-8 py-4 px-2">
      <div className="text-center space-y-3 leading-loose border-b border-black/25 pb-6 w-full max-w-md mx-auto">
        <p className="font-display text-[11px] uppercase tracking-[0.35em] text-sepia">Rank on the path</p>
        <p className="font-display text-5xl sm:text-6xl font-bold text-gold-tarnish tabular-nums tracking-tight">
          {level}
        </p>
        <p className="font-mono text-sm text-ink leading-loose">
          <span className="text-wax-red font-semibold">{formatXP(xp)}</span>
          <span className="text-sepia"> XP recorded in the ledger</span>
        </p>
      </div>

      <div className="w-full max-w-lg space-y-4 text-center">
        <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-2 font-mono text-xs sm:text-sm text-sepia leading-loose">
          <span>
            Along this rung: <span className="text-ink font-semibold">{formatXP(xpCurrent)}</span> XP
          </span>
          <span className="hidden sm:inline text-black/30">|</span>
          <span>
            Threshold ahead: <span className="text-ink font-semibold">{formatXP(xpNext)}</span> XP
          </span>
        </div>

        <div className="relative">
          <div
            className="h-6 sm:h-7 border-[3px] border-double border-ink bg-[#fdf8ed] overflow-hidden"
            style={{ boxShadow: '4px 4px 0 0 #1a1a1a' }}
          >
            <div
              className="h-full relative overflow-hidden border-r-2 border-wax-red/45 flex items-stretch"
              style={{ width: `${pct}%`, transition: 'width 0.85s ease' }}
            >
              <div className="absolute inset-0 bg-ink" />
              <div
                className="absolute inset-0 opacity-30 animate-xp-shimmer"
                style={{
                  backgroundImage: 'linear-gradient(100deg, transparent 0%, rgba(155,44,44,0.4) 45%, transparent 90%)',
                  backgroundSize: '200% 100%',
                }}
              />
            </div>
          </div>
          <div className="flex justify-between mt-2 px-1 font-mono text-[10px] text-sepia uppercase tracking-widest">
            <span>Ink</span>
            <span>{pct.toFixed(1)}% of this folio</span>
            <span>Blank</span>
          </div>
        </div>

        <p className="font-mono text-xs text-sepia leading-loose max-w-md mx-auto">
          <span className="text-wax-red font-semibold">{formatXP(toNext)}</span> XP remain before the seal turns.
        </p>
      </div>
    </div>
  )
}
