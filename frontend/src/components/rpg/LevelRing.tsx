import { useId } from 'react'
import { rankTitle, formatXP } from '@/lib/xp'

interface LevelRingProps {
  level: number
  xp: number
  xpProgress: number
  size?: number
  avatarUrl?: string | null
}

export function LevelRing({ level, xp, xpProgress, size = 120, avatarUrl }: LevelRingProps) {
  const gradientId = useId()
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(1, xpProgress))
  const center = size / 2
  const rank = rankTitle(level)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background ring */}
        <svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="4"
          />
          {/* Progress ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="animate-ring-fill"
            transform={`rotate(-90 ${center} ${center})`}
          />
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-xp)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--color-xp)" stopOpacity="1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute inset-3 rounded-full bg-surface flex items-center justify-center overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
          ) : (
            <span className="font-display font-bold text-2xl text-legendary">
              {level}
            </span>
          )}
        </div>

        {/* Level badge */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-legendary text-void text-[10px] font-mono font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
          Lvl {level}
        </div>
      </div>

      {/* Rank title */}
      <div className="text-center">
        <div className="font-display font-bold text-sm text-primary">{rank.name}</div>
        <div className="text-[10px] text-secondary italic mt-0.5">{rank.flavor}</div>
        <div className="text-xs font-mono text-xp mt-1">{formatXP(xp)} XP</div>
      </div>
    </div>
  )
}
