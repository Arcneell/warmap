/** Official mark — `public/favicon.svg` (served as `/favicon.svg`). */
export function BrandLogo({
  className = 'w-14 h-14',
  alt = 'Wardrove',
  /** Use on light parchment when multiply would dull the mark */
  noBlend = false,
}: {
  className?: string
  alt?: string
  noBlend?: boolean
}) {
  return (
    <img
      src="/favicon.svg"
      alt={alt}
      width={56}
      height={56}
      decoding="async"
      className={`shrink-0 object-contain ${noBlend ? 'opacity-100' : 'mix-blend-multiply opacity-[0.94]'} ${className}`}
    />
  )
}
