'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  DollarSign, TrendingUp, Users, Calendar, ArrowUpRight,
  ArrowDownRight, BarChart3, Target, Award, ChevronRight,
  Stethoscope, Clock
} from 'lucide-react'

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul']
const revenueData = [28000, 34000, 41000, 38000, 52000, 61000, 74000]
const maxRevenue = Math.max(...revenueData)

const kpis = [
  { label: 'Faturamento Mês', value: 'R$ 74.000', trend: '+21%', up: true, sub: 'vs mês anterior', icon: <DollarSign className="w-5 h-5" /> },
  { label: 'Novos Pacientes', value: '18', trend: '+6', up: true, sub: 'este mês', icon: <Users className="w-5 h-5" /> },
  { label: 'Consultas Realizadas', value: '42', trend: '+12%', up: true, sub: 'este mês', icon: <Stethoscope className="w-5 h-5" /> },
  { label: 'Ticket Médio', value: 'R$ 4.111', trend: '+8%', up: true, sub: 'por paciente', icon: <TrendingUp className="w-5 h-5" /> },
]

const recentConsultas = [
  { name: 'Marina Souza', procedure: 'Implante Testosterona', value: 'R$ 4.800', date: 'Hoje 14h', status: 'realizada' },
  { name: 'Carlos Menezes', procedure: 'TRT + Estradiol', value: 'R$ 5.600', date: 'Hoje 10h', status: 'realizada' },
  { name: 'Fernanda Lima', procedure: 'Consulta Inicial', value: 'R$ 350', date: 'Amanhã 09h', status: 'agendada' },
  { name: 'Roberto Alves', procedure: 'Implante DHEA', value: 'R$ 3.900', date: 'Amanhã 11h', status: 'agendada' },
  { name: 'Patrícia Costa', procedure: 'Retorno 6 meses', value: 'R$ 350', date: '01/08 15h', status: 'agendada' },
]

const goals = [
  { label: 'Meta julho', target: 80000, current: 74000 },
  { label: 'Meta trimestre', target: 200000, current: 187000 },
  { label: 'Meta anual', target: 800000, current: 328000 },
]

const procedures = [
  { name: 'Implante Testosterona', count: 18, revenue: 'R$ 86.400', pct: 54 },
  { name: 'TRH Feminina Completa', count: 9, revenue: 'R$ 50.400', pct: 27 },
  { name: 'Implante DHEA', count: 6, revenue: 'R$ 23.400', pct: 15 },
  { name: 'Consulta Inicial', count: 12, revenue: 'R$ 4.200', pct: 4 },
]

export default function ConsultorioPage() {
  const [period, setPeriod] = useState<'mes' | 'trimestre' | 'ano'>('mes')

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Meu Consultório" />
        <main className="flex-1 overflow-y-auto px-6 py-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Painel de Negócio</h2>
              <p className="text-sm text-[#71717A]">Métricas do seu consultório hormonal</p>
            </div>
            <div className="flex gap-1 bg-[#111113] border border-[#1C1C1E] rounded-xl p-1">
              {(['mes', 'trimestre', 'ano'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                    period === p
                      ? 'bg-[#7B3FE4] text-white'
                      : 'text-[#71717A] hover:text-white'
                  }`}
                >
                  {p === 'mes' ? 'Mês' : p === 'trimestre' ? 'Trimestre' : 'Ano'}
                </button>
              ))}
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {kpis.map((k, i) => (
              <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[#52525B]">{k.icon}</span>
                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${k.up ? 'text-emerald-400' : 'text-red-400'}`}>
                    {k.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{k.trend}
                  </span>
                </div>
                <p className="text-xl font-bold text-white">{k.value}</p>
                <p className="text-xs text-[#71717A] mt-0.5">{k.label}</p>
                <p className="text-[10px] text-[#52525B]">{k.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">

              {/* Revenue chart */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#7B3FE4]" /> Evolução do Faturamento
                  </h3>
                  <span className="text-xs text-[#52525B]">Últimos 7 meses</span>
                </div>
                <div className="flex items-end gap-2 h-32">
                  {revenueData.map((v, i) => {
                    const pct = (v / maxRevenue) * 100
                    const isLast = i === revenueData.length - 1
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className={`text-[9px] font-medium ${isLast ? 'text-[#7B3FE4]' : 'text-[#52525B]'}`}>
                          {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                        </span>
                        <div className="w-full rounded-t-lg overflow-hidden" style={{ height: `${pct}%`, minHeight: '8px' }}>
                          <div className={`w-full h-full ${isLast ? 'bg-gradient-to-t from-[#7B3FE4] to-[#3B82F6]' : 'bg-[#27272A]'} rounded-t-lg`} />
                        </div>
                        <span className="text-[9px] text-[#52525B]">{months[i]}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Procedures */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-[#3B82F6]" /> Procedimentos por Volume
                </h3>
                <div className="space-y-3">
                  {procedures.map((p, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-[#A1A1AA]">{p.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[#71717A] text-xs">{p.count}x</span>
                          <span className="text-white font-medium text-xs">{p.revenue}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6]"
                          style={{ width: `${p.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent consultations */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#7B3FE4]" /> Consultas Recentes
                  </h3>
                  <button className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1">
                    Ver agenda <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="space-y-2">
                  {recentConsultas.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[#1C1C1E] last:border-0">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7B3FE4]/20 to-[#3B82F6]/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#9558EE]">
                        {c.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{c.name}</p>
                        <p className="text-xs text-[#71717A]">{c.procedure}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-white">{c.value}</p>
                        <div className="flex items-center gap-1 justify-end mt-0.5">
                          <Clock className="w-2.5 h-2.5 text-[#52525B]" />
                          <span className="text-[10px] text-[#52525B]">{c.date}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ml-1 ${
                            c.status === 'realizada'
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-[#3B82F6] bg-[#3B82F6]/10'
                          }`}>
                            {c.status === 'realizada' ? 'Realizada' : 'Agendada'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">

              {/* Goals */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#7B3FE4]" /> Metas
                </h3>
                <div className="space-y-4">
                  {goals.map((g, i) => {
                    const pct = Math.min(Math.round((g.current / g.target) * 100), 100)
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#A1A1AA]">{g.label}</span>
                          <span className="text-white font-medium">{pct}%</span>
                        </div>
                        <div className="h-2 bg-[#1C1C1E] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6]'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-[#52525B] mt-1">
                          <span>R$ {(g.current / 1000).toFixed(0)}k</span>
                          <span>R$ {(g.target / 1000).toFixed(0)}k</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ROI mentoria */}
              <div className="bg-gradient-to-br from-[#7B3FE4]/10 to-[#3B82F6]/10 border border-[#7B3FE4]/25 rounded-2xl p-4">
                <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" /> ROI da Mentoria
                </h3>
                <div className="space-y-2.5">
                  {[
                    { label: 'Faturamento antes', value: 'R$ 28k/mês' },
                    { label: 'Faturamento atual', value: 'R$ 74k/mês', highlight: true },
                    { label: 'Crescimento', value: '+164%', highlight: true },
                    { label: 'Projeção 12 meses', value: 'R$ 150k+/mês' },
                  ].map((r, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-[#71717A]">{r.label}</span>
                      <span className={r.highlight ? 'text-emerald-400 font-bold' : 'text-white font-medium'}>{r.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[#7B3FE4]/20">
                  <p className="text-[10px] text-[#71717A]">Investimento mentoria: R$ 220k/ano · <span className="text-emerald-400 font-semibold">Retorno em 5 meses</span></p>
                </div>
              </div>

              {/* Next steps */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Próximos Passos
                </h3>
                <div className="space-y-2">
                  {[
                    'Ativar ANA para captação automática',
                    'Implementar protocolo de retorno 6 meses',
                    'Meta: 25 novos pacientes/mês',
                    'Contratar secretária dedicada',
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#7B3FE4] flex-shrink-0 mt-1.5" />
                      <p className="text-xs text-[#71717A]">{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
