import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  BarChart3, TrendingUp, Users, DollarSign,
  ArrowUpRight, Activity, MessageSquare, Star,
} from 'lucide-react'

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul']
const revenue = [0, 52000, 61000, 58000, 67000, 71000, 74000]
const leads = [0, 48, 55, 51, 62, 71, 74]
const maxRev = Math.max(...revenue)
const maxLeads = Math.max(...leads)

const kpis = [
  { label: 'Faturamento Total 2026', value: 'R$ 383k', sub: '+34% vs meta', icon: DollarSign, color: 'text-emerald-400' },
  { label: 'Total Leads 2026', value: '361', sub: 'captados pela ANA', icon: MessageSquare, color: 'text-[#7B3FE4]' },
  { label: 'Pacientes Ativos', value: '142', sub: '+4 este mês', icon: Users, color: 'text-[#60A5FA]' },
  { label: 'NPS Médio', value: '9.4', sub: '42 avaliações', icon: Star, color: 'text-amber-400' },
]

const sources = [
  { label: 'WhatsApp (ANA)', pct: 54, color: 'bg-[#7B3FE4]' },
  { label: 'Instagram', pct: 23, color: 'bg-[#3B82F6]' },
  { label: 'Indicação', pct: 15, color: 'bg-emerald-500' },
  { label: 'Google Ads', pct: 8, color: 'bg-amber-500' },
]

export default function AnalyticsPage() {
  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Analytics" />
        <main className="flex-1 overflow-y-auto px-6 py-5">

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {kpis.map((k, i) => (
              <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-[#52525B] mt-1">{k.sub}</p>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#3F3F46] mt-1.5">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-5 mb-5">
            {/* Revenue chart */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Faturamento Mensal (R$)
              </h3>
              <div className="flex items-end gap-2 h-32 mb-2">
                {months.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-md transition-all ${i === months.length - 1 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-[#27272A] hover:bg-[#3F3F46]'}`}
                      style={{ height: revenue[i] ? `${Math.round((revenue[i] / maxRev) * 112)}px` : '4px' }}
                      title={revenue[i] ? `R$ ${(revenue[i] / 1000).toFixed(0)}k` : '—'}
                    />
                  </div>
                ))}
              </div>
              <div className="flex">
                {months.map((m, i) => (
                  <div key={i} className="flex-1 text-center text-[9px] text-[#52525B]">{m}</div>
                ))}
              </div>
            </div>

            {/* Leads chart */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#7B3FE4]" /> Leads Captados (ANA)
              </h3>
              <div className="flex items-end gap-2 h-32 mb-2">
                {months.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={`w-full rounded-t-md ${i === months.length - 1 ? 'bg-gradient-to-t from-[#4C1B9B] to-[#7B3FE4]' : 'bg-[#27272A] hover:bg-[#3F3F46]'}`}
                      style={{ height: leads[i] ? `${Math.round((leads[i] / maxLeads) * 112)}px` : '4px' }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex">
                {months.map((m, i) => (
                  <div key={i} className="flex-1 text-center text-[9px] text-[#52525B]">{m}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {/* Sources */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#3B82F6]" /> Origem dos Leads
              </h3>
              <div className="space-y-3">
                {sources.map((s, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#A1A1AA]">{s.label}</span>
                      <span className="text-white font-semibold">{s.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                      <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversion funnel */}
            <div className="lg:col-span-2 bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" /> Funil de Conversão — Julho
              </h3>
              <div className="space-y-2">
                {[
                  { stage: 'Leads captados', value: 74, pct: 100, color: 'bg-[#27272A]' },
                  { stage: 'Qualificados', value: 42, pct: 57, color: 'bg-[#3B82F6]/60' },
                  { stage: 'Educação / Demo', value: 18, pct: 24, color: 'bg-[#7B3FE4]/70' },
                  { stage: 'Proposta enviada', value: 9, pct: 12, color: 'bg-amber-500/70' },
                  { stage: 'Fechados', value: 4, pct: 5, color: 'bg-emerald-500' },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-[#71717A] w-36 flex-shrink-0">{f.stage}</span>
                    <div className="flex-1 h-5 bg-[#18181A] rounded-md overflow-hidden">
                      <div className={`h-full ${f.color} rounded-md flex items-center justify-end pr-2`} style={{ width: `${f.pct}%` }}>
                        <span className="text-[10px] text-white font-semibold">{f.value}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#52525B] w-8 text-right flex-shrink-0">{f.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
