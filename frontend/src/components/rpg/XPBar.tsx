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

  if (compact) {
    return (
      <div className="w-full">
        <div className="h-1.5 bg-void rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-xp/70 to-xp animate-xp-shimmer"
            style={{ width: `${pct}%`, backgroundImage: 'linear-gradient(90deg, rgba(0,255,136,0.7), #00ff88, rgba(0,255,136,0.7))' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <span className="font-mono font-bold text-xs text-legendary">
          Level {level}
        </span>
        <span className="font-mono text-[10px] text-secondary">
          {formatXP(xp)} / {formatXP(xpNext)} XP
        </span>
      </div>
      <div className="h-2.5 bg-void rounded-full overflow-hidden border border-border">
        <div
          className="h-full rounded-full relative overflow-hidden transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-xp/80 to-xp" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-xp-shimmer" />
        </div>
      </div>
      <div className="text-right mt-1">
        <span className="font-mono text-[10px] text-xp/60">
          {formatXP(xpNext - xp)} XP to next level
        </span>
      </div>
    </div>
  )
}
