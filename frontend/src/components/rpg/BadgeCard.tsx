import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import type { Badge } from '@/api/types'
import { getTierStyle } from '@/lib/badges'
import { formatNumber } from '@/lib/format'

function sanitizeSvg(html: string): string {
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
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
    <motion.article
      whileHover={earned ? { y: -3 } : undefined}
      className={`relative flex flex-col items-stretch p-8 sm:p-10 border-4 border-double transition-all leading-loose ${
        earned ? `${tier.glowClass}` : 'opacity-60 grayscale'
      }`}
      style={{
        background: earned ? tier.bgColor : 'var(--color-parchment)',
        borderColor: earned ? tier.borderColor : 'var(--color-ink)',
        boxShadow: '6px 6px 0 0 #1a1a1a',
      }}
    >
      <div
        className="absolute top-6 right-6 text-[9px] font-mono font-bold uppercase tracking-widest px-3 py-1.5 border-2 border-ink"
        style={{ color: tier.color, background: 'var(--color-parchment)' }}
      >
        {tier.label}
      </div>

      <div className="mb-8 flex justify-center pt-2">
        {earned ? (
          <div
            className="badge-seal-frame w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] flex items-center justify-center [&_svg]:max-w-[2.75rem] [&_svg]:max-h-[2.75rem]"
            style={{ color: tier.color }}
          >
            <div
              className="[&_svg]:stroke-[1.75] [&_path]:fill-none [&_circle]:fill-none [&_rect]:fill-none"
              dangerouslySetInnerHTML={{ __html: sanitizeSvg(badge.icon_svg) }}
            />
          </div>
        ) : (
          <div className="badge-seal-frame w-16 h-16 flex items-center justify-center text-muted">
            <Lock size={26} strokeWidth={1.75} className="text-ink" />
          </div>
        )}
      </div>

      <div className="text-center space-y-4 flex-1 flex flex-col">
        <h3
          className="font-display font-bold text-sm sm:text-base border-b border-black/25 pb-4 leading-relaxed px-2"
          style={{ color: earned ? tier.color : 'var(--color-muted)' }}
        >
          {badge.name}
        </h3>
        <p className="text-xs sm:text-sm text-sepia leading-loose text-center px-1">
          {badge.description}
        </p>
      </div>

      {progress !== undefined && !earned && (
        <div className="mt-8 pt-6 border-t border-black/20 space-y-3">
          <div className="h-3 border-2 border-ink bg-parchment overflow-hidden">
            <div
              className="h-full border-r border-ink transition-all duration-500"
              style={{
                width: `${progress * 100}%`,
                background: 'var(--color-ink)',
                opacity: 0.88,
              }}
            />
          </div>
          <p className="text-[10px] font-mono text-sepia text-center leading-loose tracking-wide">
            {formatNumber(currentValue ?? 0)} / {formatNumber(badge.criteria_value)}
          </p>
        </div>
      )}

      {earned && badge.earned_at && (
        <p className="text-[10px] font-mono text-sepia mt-8 text-center leading-loose border-t border-black/15 pt-5">
          Inscribed {new Date(badge.earned_at).toLocaleDateString()}
        </p>
      )}
    </motion.article>
  )
}
