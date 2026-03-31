import { useId } from 'react'
import { rankTitle, formatXP } from '@/lib/xp'

interface LevelRingProps {
  level: number
  xp: number
  xpProgress: number
  size?: number
  avatarUrl?: string | null
}

export function LevelRing({ level, xp, xpProgress, size = 140, avatarUrl }: LevelRingProps) {
  const gradientId = useId()
  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(1, xpProgress))
  const center = size / 2
  const rank = rankTitle(level)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="absolute inset-0" viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="4"
            opacity="0.35"
            strokeDasharray="6 4"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth="5"
            strokeLinecap="square"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="animate-ring-fill"
            transform={`rotate(-90 ${center} ${center})`}
          />
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b6914" />
              <stop offset="100%" stopColor="#b8860b" />
            </linearGradient>
          </defs>
        </svg>

        <div
          className="absolute inset-[10px] border-[3px] border-double border-ink bg-parchment flex items-center justify-center overflow-hidden"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(184,134,11,0.25), 2px 2px 0 0 #1a1a1a' }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover grayscale-[0.15] contrast-[1.05]" />
          ) : (
            <span className="font-display font-bold text-2xl text-gold-tarnish">{level}</span>
          )}
        </div>

        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-2 border-ink bg-parchment text-ink text-[11px] font-mono font-bold px-2.5 py-0.5 whitespace-nowrap"
          style={{ boxShadow: '2px 2px 0 0 #1a1a1a' }}
        >
          Lvl {level}
        </div>
      </div>

      <div className="text-center mt-1">
        <div className="font-display font-bold text-[15px] text-gold-tarnish">{rank.name}</div>
        <div className="text-[11px] text-sepia italic mt-0.5">{rank.flavor}</div>
        <div className="text-[12px] font-mono text-ink mt-1">{formatXP(xp)} XP</div>
      </div>
    </div>
  )
}
