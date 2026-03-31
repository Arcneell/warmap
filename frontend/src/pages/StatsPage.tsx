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
    <div className="flex-1 min-h-0">
      <div className="max-w-6xl mx-auto px-8 py-8 space-y-6">
        <header className="text-center space-y-2">
          <h1 className="font-display text-3xl font-bold text-wax-red tracking-wide">World Chronicles</h1>
          <p className="text-base text-sepia">Tallies from every wardriver — sigils, channels, and names in the ledger.</p>
        </header>

        {stats && (
          <section className="rulebook-frame bg-parchment p-6">
            <h2 className="font-display text-center text-base font-bold text-ink border-b border-black/20 pb-3 mb-3">
              Grand Totals
            </h2>
            <div className="grid grid-cols-5 gap-6">
              {tallyRows.map((row) => (
                <div key={row.label} className="text-center space-y-1.5">
                  <span className="text-sepia flex justify-center">{row.icon}</span>
                  <p className={`font-mono text-xl font-bold tabular-nums ${row.color}`}>{formatNumber(row.value)}</p>
                  <p className="text-xs text-sepia">{row.label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 gap-7">
          {encData.length > 0 && (
            <GrimoirePanel title="Encryption distribution" icon={<Shield size={18} strokeWidth={1.75} />}>
              <div className="h-60 mb-4 w-full" aria-label="Encryption distribution chart" role="img">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={encData} cx="50%" cy="50%" innerRadius={52} outerRadius={86} paddingAngle={2} dataKey="value" stroke="#1a1a1a" strokeWidth={1}>
                      {encData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(value: number) => formatNumber(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex flex-wrap gap-x-6 gap-y-4 justify-center list-none w-full">
                {encData.map((d) => (
                  <li key={d.name} className="flex items-center gap-2 text-base font-mono leading-relaxed">
                    <span className="w-3 h-3 border border-ink shrink-0" style={{ background: d.color }} />
                    <span className="text-gray-800">{d.name}</span>
                    <span className="text-gray-900 font-semibold tabular-nums">{formatNumber(d.value)}</span>
                  </li>
                ))}
              </ul>
            </GrimoirePanel>
          )}

          {channels && channels.length > 0 && (
            <GrimoirePanel title="Channel spread" icon={<BarChart3 size={18} strokeWidth={1.75} />}>
              <div className="h-72 w-full" aria-label="Wi-Fi channel spread chart" role="img">
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
              <ul className="flex w-full list-none flex-col overflow-y-auto max-h-80">
                {manufacturers.slice(0, 15).map((m, i) => (
                  <li
                    key={i}
                    className="ledger-line flex w-full items-center justify-center gap-4 py-5 px-2 text-center first:pt-2 flex-row flex-wrap"
                  >
                    <span className="w-8 shrink-0 text-right font-mono text-sm tabular-nums text-gray-700">{i + 1}</span>
                    <div className="h-3 w-full max-w-[18rem] border-2 border-ink bg-parchment overflow-hidden">
                      <div className="h-full bg-ink/85" style={{ width: `${(m.count / manufacturers[0].count) * 100}%` }} />
                    </div>
                    <span className="max-w-[18rem] shrink truncate font-display text-sm leading-relaxed text-gray-900">{m.manufacturer}</span>
                    <span className="shrink-0 font-mono text-sm tabular-nums text-gray-800">{formatNumber(m.count)}</span>
                  </li>
                ))}
              </ul>
            </GrimoirePanel>
          )}

          {topSSIDs && topSSIDs.length > 0 && (
            <GrimoirePanel title="Most spoken SSIDs" icon={<Wifi size={18} strokeWidth={1.75} />}>
              <ol className="marker:text-gold-tarnish flex max-h-80 list-inside list-decimal flex-col overflow-y-auto marker:font-display">
                {topSSIDs.map((s, i) => (
                  <li
                    key={i}
                    className="ledger-line flex w-full items-center justify-center gap-8 py-5 px-2 pl-2 text-center -ml-2"
                  >
                    <span className="min-w-0 max-w-full font-mono text-base leading-relaxed text-gray-900 break-words">{s.ssid || '<hidden>'}</span>
                    <span className="shrink-0 font-mono text-base tabular-nums text-gray-800">{formatNumber(s.count)}</span>
                  </li>
                ))}
              </ol>
            </GrimoirePanel>
          )}

          {countries && countries.length > 0 && (
            <GrimoirePanel title="Realms by MCC" icon={<Globe size={18} strokeWidth={1.75} />} className="col-span-2">
              <ul className="grid max-h-80 w-full list-none grid-cols-2 gap-x-10 overflow-y-auto">
                {countries.slice(0, 15).map((c, i) => (
                  <li
                    key={i}
                    className="ledger-line flex flex-col items-center gap-2 py-5 px-2 text-center"
                  >
                    <div className="flex flex-wrap items-baseline justify-center gap-2">
                      <span className="w-7 shrink-0 text-right font-mono text-xs tabular-nums text-gray-700">{i + 1}</span>
                      <span className="max-w-none truncate font-display text-sm leading-relaxed text-gray-900">{c.country}</span>
                      <span className="shrink-0 font-mono text-[10px] text-gray-600">({c.mcc})</span>
                    </div>
                    <span className="font-mono text-sm tabular-nums text-gray-800">{formatNumber(c.count)}</span>
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
    <section className={`rulebook-frame bg-parchment p-10 w-full ${className}`}>
      <header className="text-center space-y-4 border-b border-black/30 pb-8 mb-10 w-full">
        <div className="flex justify-center text-wax-red" aria-hidden>{icon}</div>
        <h2 className="font-display text-xl font-bold text-wax-red tracking-wide leading-loose px-4">
          {title}
        </h2>
      </header>
      <div className="w-full text-center text-base leading-relaxed text-gray-900">{children}</div>
    </section>
  )
}
