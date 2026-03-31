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
      <div className="w-full space-y-1">
        <div className="flex justify-between text-[10px] font-mono text-sepia">
          <span>Lvl {level}</span>
          <span>{formatXP(xp)} / {formatXP(xpNext)}</span>
        </div>
        <div className="h-2 border-2 border-ink bg-[#fdf8ed] overflow-hidden">
          <div className="h-full bg-ink" style={{ width: `${pct}%`, transition: 'width 0.7s ease' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-display text-sm font-bold text-gold-tarnish">Level {level}</span>
        <span className="font-mono text-xs text-sepia">{formatXP(xp)} / {formatXP(xpNext)} XP</span>
      </div>

      <div className="h-4 border-2 border-ink bg-[#fdf8ed] overflow-hidden" style={{ boxShadow: '2px 2px 0 0 #1a1a1a' }}>
        <div className="h-full relative overflow-hidden" style={{ width: `${pct}%`, transition: 'width 0.8s ease' }}>
          <div className="absolute inset-0 bg-ink" />
          <div className="absolute inset-0 opacity-25 animate-xp-shimmer" style={{ backgroundImage: 'linear-gradient(100deg, transparent, rgba(155,44,44,0.4), transparent)', backgroundSize: '200% 100%' }} />
        </div>
      </div>

      <div className="text-right">
        <span className="font-mono text-[10px] text-sepia">{formatXP(toNext)} XP to next level</span>
      </div>
    </div>
  )
}
