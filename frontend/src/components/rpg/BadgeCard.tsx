import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import type { Badge } from '@/api/types'
import { getTierStyle } from '@/lib/badges'
import { formatNumber } from '@/lib/format'

function sanitizeSvg(html: string): string {
  // Only allow SVG elements — strip scripts, event handlers, and non-SVG tags
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
  // Verify it starts with an SVG tag
  if (!clean.trim().startsWith('<svg')) return ''
  return clean
}

interface BadgeCardProps {
  badge: Badge
  showProgress?: boolean
  currentValue?: number
}

export function BadgeCard({ badge, showProgress, currentValue }: BadgeCardProps) {
  const tier = getTierStyle(badge.tier)
  const earned = badge.earned

  const progress = showProgress && currentValue != null
    ? Math.min(1, currentValue / badge.criteria_value)
    : undefined

  return (
    <motion.div
      whileHover={earned ? { scale: 1.05, y: -4 } : undefined}
      className={`relative rounded-xl p-4 border transition-all ${
        earned
          ? tier.glowClass
          : 'border-border opacity-50 grayscale'
      }`}
      style={{
        background: earned ? tier.bgColor : 'var(--color-surface)',
        borderColor: earned ? tier.borderColor : 'var(--color-border)',
      }}
    >
      {/* Tier label */}
      <div
        className="absolute top-2 right-2 text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
        style={{ color: tier.color, background: tier.bgColor }}
      >
        {tier.label}
      </div>

      {/* Icon */}
      <div className="mb-3 flex justify-center">
        {earned ? (
          <div
            className="w-12 h-12 flex items-center justify-center"
            style={{ color: tier.color }}
            dangerouslySetInnerHTML={{ __html: sanitizeSvg(badge.icon_svg) }}
          />
        ) : (
          <div className="w-12 h-12 flex items-center justify-center text-muted">
            <Lock size={24} />
          </div>
        )}
      </div>

      {/* Name & description */}
      <div className="text-center">
        <div className="font-semibold text-xs mb-1" style={{ color: earned ? tier.color : 'var(--color-muted)' }}>
          {badge.name}
        </div>
        <div className="text-[10px] text-secondary leading-relaxed">
          {badge.description}
        </div>
      </div>

      {/* Progress bar */}
      {progress !== undefined && !earned && (
        <div className="mt-3">
          <div className="h-1 bg-void rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress * 100}%`,
                background: tier.color,
                opacity: 0.7,
              }}
            />
          </div>
          <div className="text-[9px] font-mono text-muted mt-1 text-center">
            {formatNumber(currentValue ?? 0)} / {formatNumber(badge.criteria_value)}
          </div>
        </div>
      )}

      {/* Earned date */}
      {earned && badge.earned_at && (
        <div className="text-[9px] font-mono text-secondary mt-2 text-center">
          Unlocked {new Date(badge.earned_at).toLocaleDateString()}
        </div>
      )}
    </motion.div>
  )
}
