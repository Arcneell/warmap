import { useGlobalStats, useChannelStats, useManufacturerStats, useCountryStats, useTopSSIDs } from '@/api/hooks'
import { formatNumber } from '@/lib/format'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Wifi, Bluetooth, Radio, Users, Upload, Shield, BarChart3, Globe, Cpu } from 'lucide-react'

const ENC_ORDER = ['WPA3', 'WPA2', 'WPA', 'WEP', 'Open', 'Unknown']
const ENC_COLORS: Record<string, string> = {
  WPA3: '#1a4d2e', WPA2: '#1e4a6b', WPA: '#8b4513', WEP: '#9b2c2c', Open: '#5c5348', Unknown: '#5c5348',
}

const tooltipStyle = {
  contentStyle: {
    background: '#fdf5e6',
    border: '2px solid #1a1a1a',
    borderRadius: '0',
    fontSize: '11px',
    fontFamily: 'Courier Prime, ui-monospace, monospace',
    color: '#1a1a1a',
    boxShadow: '4px 4px 0 0 #1a1a1a',
  },
}

export function StatsPage() {
  const { data: stats } = useGlobalStats()
  const { data: channels } = useChannelStats()
  const { data: manufacturers } = useManufacturerStats()
  const { data: countries } = useCountryStats()
  const { data: topSSIDs } = useTopSSIDs()

  const encData = stats
    ? ENC_ORDER.map((enc) => ({
        name: enc,
        value: stats.by_encryption[enc] ?? 0,
        color: ENC_COLORS[enc],
      })).filter((d) => d.value > 0)
    : []

  const tallyRows = stats
    ? [
        { icon: <Wifi size={22} strokeWidth={1.75} />, label: 'Wi-Fi networks', value: stats.total_wifi, color: 'text-wifi' },
        { icon: <Bluetooth size={22} strokeWidth={1.75} />, label: 'Bluetooth devices', value: stats.total_bt, color: 'text-bt' },
        { icon: <Radio size={22} strokeWidth={1.75} />, label: 'Cell towers', value: stats.total_cell, color: 'text-cell' },
        { icon: <Users size={22} strokeWidth={1.75} />, label: 'Operators', value: stats.total_users, color: 'text-epic' },
        { icon: <Upload size={22} strokeWidth={1.75} />, label: 'Uploads filed', value: stats.total_uploads, color: 'text-ink' },
      ]
    : []

  return (
    <div className="flex-1 overflow-y-auto min-h-0">
      <div className="max-w-6xl mx-auto px-8 sm:px-12 lg:px-16 py-12 sm:py-16 lg:py-20 space-y-14 sm:space-y-16">
        <header className="text-center max-w-2xl mx-auto space-y-6">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-wax-red tracking-wide leading-loose border-b border-black/30 pb-8">
            World chronicles
          </h1>
          <p className="text-sm sm:text-base text-sepia font-sans leading-loose">
            Tallies from every wardriver — sigils, channels, and names scratched in the ledger.
          </p>
        </header>

        {stats && (
          <section className="rulebook-frame bg-parchment p-10 sm:p-12 lg:p-14">
            <h2 className="font-display text-center text-xl sm:text-2xl font-bold text-ink leading-loose border-b border-black/30 pb-8 mb-2">
              Grand totals
            </h2>
            <ul className="list-none flex flex-col">
              {tallyRows.map((row) => (
                <li
                  key={row.label}
                  className="ledger-line flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-8 px-2 first:pt-6"
                >
                  <div className="flex items-center gap-5 min-w-0">
                    <span className={`shrink-0 ${row.color} [&_svg]:text-ink`}>{row.icon}</span>
                    <span className="font-display text-sm sm:text-base text-sepia leading-loose">{row.label}</span>
                  </div>
                  <span className={`font-mono font-bold text-xl sm:text-2xl tabular-nums shrink-0 ${row.color}`}>
                    {formatNumber(row.value)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 lg:gap-12">
          {encData.length > 0 && (
            <GrimoirePanel title="Encryption distribution" icon={<Shield size={18} strokeWidth={1.75} />}>
              <div className="h-64 sm:h-72 mb-10">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={encData} cx="50%" cy="50%" innerRadius={52} outerRadius={86} paddingAngle={2} dataKey="value" stroke="#1a1a1a" strokeWidth={1}>
                      {encData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(value: number) => formatNumber(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-4 justify-center list-none">
                {encData.map((d) => (
                  <li key={d.name} className="flex items-center gap-2 text-sm font-mono leading-loose">
                    <span className="w-3 h-3 border border-ink shrink-0" style={{ background: d.color }} />
                    <span className="text-sepia">{d.name}</span>
                    <span className="text-ink font-semibold tabular-nums">{formatNumber(d.value)}</span>
                  </li>
                ))}
              </ul>
            </GrimoirePanel>
          )}

          {channels && channels.length > 0 && (
            <GrimoirePanel title="Channel spread" icon={<BarChart3 size={18} strokeWidth={1.75} />}>
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channels.slice(0, 20)}>
                    <XAxis dataKey="channel" tick={{ fill: '#4a3b32', fontSize: 9, fontFamily: 'Courier Prime, monospace' }} />
                    <YAxis tick={{ fill: '#4a3b32', fontSize: 9, fontFamily: 'Courier Prime, monospace' }} />
                    <Tooltip {...tooltipStyle} formatter={(value: number) => formatNumber(value)} />
                    <Bar dataKey="count" fill="#1e4a6b" stroke="#1a1a1a" strokeWidth={1} radius={[0, 0, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GrimoirePanel>
          )}

          {manufacturers && manufacturers.length > 0 && (
            <GrimoirePanel title="Top manufacturers" icon={<Cpu size={18} strokeWidth={1.75} />}>
              <ul className="list-none max-h-80 overflow-y-auto flex flex-col">
                {manufacturers.slice(0, 15).map((m, i) => (
                  <li
                    key={i}
                    className="ledger-line flex items-center gap-4 py-5 px-2 first:pt-2"
                  >
                    <span className="font-mono text-xs text-sepia w-8 text-right tabular-nums shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0 h-3 border-2 border-ink bg-parchment overflow-hidden">
                      <div className="h-full bg-ink/85" style={{ width: `${(m.count / manufacturers[0].count) * 100}%` }} />
                    </div>
                    <span className="text-sm text-ink truncate max-w-[10rem] sm:max-w-[14rem] font-display leading-loose shrink">{m.manufacturer}</span>
                    <span className="font-mono text-sm text-sepia tabular-nums shrink-0">{formatNumber(m.count)}</span>
                  </li>
                ))}
              </ul>
            </GrimoirePanel>
          )}

          {topSSIDs && topSSIDs.length > 0 && (
            <GrimoirePanel title="Most spoken SSIDs" icon={<Wifi size={18} strokeWidth={1.75} />}>
              <ol className="list-decimal list-inside max-h-80 overflow-y-auto marker:font-display marker:text-gold-tarnish flex flex-col">
                {topSSIDs.map((s, i) => (
                  <li
                    key={i}
                    className="ledger-line flex justify-between items-baseline gap-8 py-5 px-2 -ml-2 pl-2"
                  >
                    <span className="font-mono text-sm text-ink truncate min-w-0 leading-loose">{s.ssid || '<hidden>'}</span>
                    <span className="font-mono text-sm text-sepia tabular-nums shrink-0">{formatNumber(s.count)}</span>
                  </li>
                ))}
              </ol>
            </GrimoirePanel>
          )}

          {countries && countries.length > 0 && (
            <GrimoirePanel title="Realms by MCC" icon={<Globe size={18} strokeWidth={1.75} />} className="xl:col-span-2">
              <ul className="list-none max-h-80 overflow-y-auto grid sm:grid-cols-2 gap-x-10">
                {countries.slice(0, 15).map((c, i) => (
                  <li
                    key={i}
                    className="ledger-line flex justify-between items-baseline gap-6 py-5 px-2"
                  >
                    <div className="flex items-baseline gap-3 min-w-0">
                      <span className="font-mono text-xs text-sepia w-7 text-right shrink-0 tabular-nums">{i + 1}</span>
                      <span className="font-display text-sm text-ink truncate leading-loose">{c.country}</span>
                      <span className="font-mono text-[10px] text-muted shrink-0">({c.mcc})</span>
                    </div>
                    <span className="font-mono text-sm text-sepia tabular-nums shrink-0">{formatNumber(c.count)}</span>
                  </li>
                ))}
              </ul>
            </GrimoirePanel>
          )}
        </div>
      </div>
    </div>
  )
}

function GrimoirePanel({
  title,
  icon,
  children,
  className = '',
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rulebook-frame bg-parchment p-10 sm:p-12 ${className}`}>
      <header className="text-center space-y-4 border-b border-black/30 pb-8 mb-10">
        <div className="flex justify-center text-wax-red" aria-hidden>{icon}</div>
        <h2 className="font-display text-lg sm:text-xl font-bold text-wax-red tracking-wide leading-loose px-4">
          {title}
        </h2>
      </header>
      <div className="text-[13px] text-ink leading-loose">{children}</div>
    </section>
  )
}
