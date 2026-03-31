import { useGlobalStats, useChannelStats, useManufacturerStats, useCountryStats, useTopSSIDs } from '@/api/hooks'
import { formatNumber } from '@/lib/format'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Wifi, Bluetooth, Radio, Users, Upload, Shield, BarChart3, Globe, Cpu } from 'lucide-react'
import { encryptionColor } from '@/lib/format'

const ENC_ORDER = ['WPA3', 'WPA2', 'WPA', 'WEP', 'Open', 'Unknown']
const ENC_COLORS_MAP: Record<string, string> = {
  WPA3: '#00ff88', WPA2: '#00d4ff', WPA: '#f59e0b', WEP: '#ef4444', Open: '#6b7280', Unknown: '#555570',
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
        color: ENC_COLORS_MAP[enc],
      })).filter((d) => d.value > 0)
    : []

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-2">World Status</h1>
          <p className="text-sm text-secondary">Global intelligence overview of the wardriving network</p>
        </div>

        {/* Big stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            <BigStat icon={<Wifi size={20} />} value={stats.total_wifi} label="WiFi Networks" color="text-wifi" />
            <BigStat icon={<Bluetooth size={20} />} value={stats.total_bt} label="BT Devices" color="text-bt" />
            <BigStat icon={<Radio size={20} />} value={stats.total_cell} label="Cell Towers" color="text-cell" />
            <BigStat icon={<Users size={20} />} value={stats.total_users} label="Operators" color="text-epic" />
            <BigStat icon={<Upload size={20} />} value={stats.total_uploads} label="Uploads" color="text-xp" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Encryption distribution */}
          {encData.length > 0 && (
            <Card title="Encryption Distribution" icon={<Shield size={16} />}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={encData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {encData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-panel)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono',
                      }}
                      formatter={(value: number) => formatNumber(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {encData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-secondary">{d.name}</span>
                    <span className="font-mono text-primary">{formatNumber(d.value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Channel distribution */}
          {channels && channels.length > 0 && (
            <Card title="Channel Distribution" icon={<BarChart3 size={16} />}>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channels.slice(0, 20)}>
                    <XAxis dataKey="channel" tick={{ fill: '#8888a8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#8888a8', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-panel)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono',
                      }}
                      formatter={(value: number) => formatNumber(value)}
                    />
                    <Bar dataKey="count" fill="#00d4ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Top Manufacturers */}
          {manufacturers && manufacturers.length > 0 && (
            <Card title="Top Manufacturers" icon={<Cpu size={16} />}>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {manufacturers.slice(0, 15).map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-muted w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="h-1.5 bg-void rounded-full overflow-hidden">
                        <div
                          className="h-full bg-wifi/40 rounded-full"
                          style={{ width: `${(m.count / manufacturers[0].count) * 100}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-primary truncate max-w-[140px]">{m.manufacturer}</span>
                    <span className="font-mono text-[10px] text-secondary flex-shrink-0">{formatNumber(m.count)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Top SSIDs */}
          {topSSIDs && topSSIDs.length > 0 && (
            <Card title="Most Common SSIDs" icon={<Wifi size={16} />}>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {topSSIDs.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] text-muted w-5 text-right">{i + 1}</span>
                      <span className="font-mono text-xs text-primary truncate">{s.ssid || '<hidden>'}</span>
                    </div>
                    <span className="font-mono text-[10px] text-secondary flex-shrink-0 ml-3">{formatNumber(s.count)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Countries */}
          {countries && countries.length > 0 && (
            <Card title="Countries (by MCC)" icon={<Globe size={16} />}>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {countries.slice(0, 15).map((c, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted w-5 text-right">{i + 1}</span>
                      <span className="text-xs text-primary">{c.country}</span>
                      <span className="font-mono text-[10px] text-muted">MCC {c.mcc}</span>
                    </div>
                    <span className="font-mono text-[10px] text-secondary">{formatNumber(c.count)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function BigStat({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="bg-panel rounded-2xl border border-border p-5 text-center">
      <div className={`${color} mb-2 flex justify-center`}>{icon}</div>
      <div className={`font-mono font-bold text-2xl ${color}`}>{formatNumber(value)}</div>
      <div className="text-[10px] text-secondary mt-1">{label}</div>
    </div>
  )
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-panel rounded-2xl border border-border p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-wifi">{icon}</span>
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
      </div>
      {children}
    </div>
  )
}
