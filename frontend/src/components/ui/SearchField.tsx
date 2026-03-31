import type { KeyboardEvent } from 'react'
import { Search } from 'lucide-react'

type SearchFieldProps = {
  value: string
  onChange: (v: string) => void
  placeholder: string
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  /** Extra classes on outer shell (border container) */
  className?: string
  inputClassName?: string
}

/** Loupe dans une colonne dédiée — le texte ne passe jamais sous l’icône (pas de position absolute). */
export function SearchField({
  value,
  onChange,
  placeholder,
  onKeyDown,
  className = '',
  inputClassName = '',
}: SearchFieldProps) {
  return (
    <div
      className={`flex w-full min-w-0 items-stretch border-2 border-ink bg-[#fdf8ed] ${className}`}
      role="search"
    >
      <span
        className="flex w-11 shrink-0 items-center justify-center border-r border-ink/20 text-gray-500"
        aria-hidden
      >
        <Search className="h-5 w-5 shrink-0" strokeWidth={1.75} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`min-w-0 flex-1 border-0 bg-transparent py-3 pl-3 pr-4 text-base font-mono text-gray-900 placeholder:text-gray-500 outline-none focus:ring-0 leading-relaxed ${inputClassName}`}
      />
    </div>
  )
}
