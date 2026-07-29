'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  DollarSign, TrendingUp, TrendingDown, ArrowUpRight,
  ArrowDownRight, ChevronRight, Download, Calendar,
  FileText, BarChart3, CheckCircle2, AlertCircle,
} from 'lucide-react'

const months = [
  { month: 'Fev', receita: 52000, despesa: 22000 },
  { month: 'Mar', receita: 61000, despesa: 24000 },
  { month: 'Abr', receita: 58000, despesa: 25000 },
  { month: 'Mai', receita: 67000, despesa: 26000 },
  { month: 'Jun', receita: 71000, despesa: 27000 },
  { month: 'Jul', receita: 74000, despesa: 28000 },
]
const maxR = Math.max(...months.map(m => m.receita))

const receitas = [
  { desc: 'Implante Testosterona — 18 procedimentos', value: 'R$ 43.200', pct: 58 },
  { desc: 'Implante Estrógeno — 8 procedimentos', value: 'R$ 19.200', pct: 26 },
  { desc: 'Consultas e acompanhamentos', value: 'R$ 7.200', pct: 10 },
  { desc: 'Outros procedimentos', value: 'R$ 4.400', pct: 6 },
]

const despesas = [
  { desc: 'Insumos e implantes', value: 'R$ 12.400', icon: AlertCircle, color: 'text-red-400' },
  { desc: 'Aluguel e estrutura', value: 'R$ 6.800', icon: AlertCircle, color: 'text-red-400' },
  { desc: 'Equipe e folha', value: 'R$ 5.200', icon: AlertCircle, color: 'text-red-400' },
  { desc: 'Marketing e tráfego', value: 'R$ 2.100', icon: AlertCircle, color: 'text-amber-400' },
  { desc: 'Hormone Ecosystem (plano Elite)', value: 'R$ 1.500', icon: CheckCircle2, color: 'text-[#7B3FE4]' },
]

const invoices = [
  { desc: 'Fechamento Junho 2026', date: '01 Jul 2026', value: 'R$ 43.000', status: 'Pago' },
  { desc: 'Fechamento Maio 2026', date: '01 Jun 2026', value: 'R$ 41.000', status: 'Pago' },
  { desc: 'Fechamento Abril 2026', date: '01 Mai 2026', value: 'R$ 33.000', status: 'Pago' },
]

export default function FinanceiroPage() {
  const [tab, setTab] = useState<'dre' | 'receber' | 'historico'>('dre')

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Financeiro" />
        <main className="flex-1 overflow-y-auto px-6 py-5">

          {/* Header KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'RECEITA BRUTA', value: 'R$ 74k', sub: '+21% vs mês ant', icon: TrendingUp, up: true, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'from-emerald-500/10 to-emerald-600/5' },
              { label: 'DESPESAS', value: 'R$ 28k', sub: '+3% vs mês ant', icon: TrendingDown, up: false, color: 'text-red-400', border: 'border-red-500/20', bg: 'from-red-500/10 to-red-600/5' },
              { label: 'LUCRO LÍQUIDO', value: 'R$ 46k', sub: 'margem 62%', icon: DollarSign, up: true, color: 'text-white', border: 'border-[#7B3FE4]/20', bg: 'from-[#7B3FE4]/10 to-[#3B82F6]/5' },
              { label: 'MRR ESTIMADO', value: 'R$ 22k', sub: 'recorrência mensal', icon: BarChart3, up: null, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'from-amber-500/10 to-amber-600/5' },
            ].map((k, i) => (
              <div key={i} className={`bg-gradient-to-br ${k.bg} border ${k.border} rounded-2xl p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                  {k.up === true && <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />}
                  {k.up === false && <ArrowDownRight className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-[#71717A] mt-1">{k.sub}</p>
                <p className="text-[9px] font-semibold uppercase tracking-widest text-[#52525B] mt-2">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-[#111113] border border-[#1C1C1E] p-1 rounded-xl w-fit">
            {(['dre', 'receber', 'historico'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-xs font-medium px-4 py-2 rounded-lg transition-all ${tab === t ? 'bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white' : 'text-[#71717A] hover:text-white'}`}
              >
                {t === 'dre' ? 'DRE Mensal' : t === 'receber' ? 'A Receber' : 'Histórico'}
              </button>
            ))}
          </div>

          {tab === 'dre' && (
            <div className="grid lg:grid-cols-2 gap-5">
              {/* Chart */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-white">Receita vs Despesa (2026)</h3>
                  <button className="flex items-center gap-1.5 text-xs text-[#52525B] hover:text-white transition-colors">
                    <Download className="w-3.5 h-3.5" /> Exportar
                  </button>
                </div>
                <div className="flex items-end gap-3 h-36 mb-3">
                  {months.map((m, i) => (
                    <div key={i} className="flex-1 flex items-end gap-1">
                      <div
                        className={`flex-1 rounded-t-md ${i === months.length - 1 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-[#27272A]'}`}
                        style={{ height: `${Math.round((m.receita / maxR) * 120)}px` }}
                      />
                      <div
                        className="flex-1 bg-red-500/30 rounded-t-md"
                        style={{ height: `${Math.round((m.despesa / maxR) * 120)}px` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between">
                  {months.map((m, i) => (
                    <div key={i} className="flex-1 text-center text-[9px] text-[#52525B]">{m.month}</div>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px]">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" /><span className="text-[#71717A]">Receita</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-red-500/50" /><span className="text-[#71717A]">Despesa</span></div>
                </div>
              </div>

              {/* DRE breakdown */}
              <div className="space-y-3">
                <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> Receitas — Julho
                  </h3>
                  <div className="space-y-3">
                    {receitas.map((r, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#A1A1AA]">{r.desc}</span>
                          <span className="text-emerald-400 font-semibold">{r.value}</span>
                        </div>
                        <div className="h-1 bg-[#1C1C1E] rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500/50 rounded-full" style={{ width: `${r.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#1C1C1E] flex justify-between text-sm font-bold">
                    <span className="text-white">Total Receita</span>
                    <span className="text-emerald-400">R$ 74.000</span>
                  </div>
                </div>

                <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-400" /> Despesas — Julho
                  </h3>
                  <div className="space-y-2">
                    {despesas.map((d, i) => (
                      <div key={i} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <d.icon className={`w-3.5 h-3.5 ${d.color} flex-shrink-0`} />
                          <span className="text-xs text-[#A1A1AA]">{d.desc}</span>
                        </div>
                        <span className="text-xs font-semibold text-red-400 flex-shrink-0">{d.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#1C1C1E] flex justify-between text-sm font-bold">
                    <span className="text-white">Total Despesas</span>
                    <span className="text-red-400">R$ 28.000</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'historico' && (
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1C1C1E] flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#71717A]" /> Histórico de Fechamentos
                </h3>
                <button className="flex items-center gap-1.5 text-xs text-[#52525B] hover:text-white transition-colors">
                  <Download className="w-3.5 h-3.5" /> Exportar CSV
                </button>
              </div>
              {invoices.map((inv, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-4 border-b border-[#1C1C1E] last:border-0 hover:bg-[#18181A]/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{inv.desc}</p>
                      <p className="text-xs text-[#52525B] flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" /> {inv.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white">{inv.value}</span>
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'receber' && (
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="text-center py-8">
                <BarChart3 className="w-8 h-8 text-[#52525B] mx-auto mb-3" />
                <p className="text-sm font-medium text-white">Sem valores a receber pendentes</p>
                <p className="text-xs text-[#52525B] mt-1">Todos os pagamentos estão em dia</p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
