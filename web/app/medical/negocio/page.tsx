'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  DollarSign, TrendingUp, Users, Bot, Settings,
  BarChart3, Kanban, ArrowUpRight, CheckCircle2,
  Clock, ChevronRight, Activity,
} from 'lucide-react'

type Tab = 'financeiro' | 'crm' | 'agentes'

const barData = [
  { month: 'Jan', value: 38 },
  { month: 'Fev', value: 52 },
  { month: 'Mar', value: 47 },
  { month: 'Abr', value: 61 },
  { month: 'Mai', value: 70 },
  { month: 'Jun', value: 65 },
  { month: 'Jul', value: 74 },
]
const maxVal = Math.max(...barData.map(d => d.value))

const procedures = [
  { name: 'Implante Pellet Testosterona', count: 34, revenue: 'R$ 32.640', avg: 'R$ 960' },
  { name: 'Implante Pellet Estrogênio', count: 22, revenue: 'R$ 19.800', avg: 'R$ 900' },
  { name: 'Consulta Inicial Hormonal', count: 58, revenue: 'R$ 11.600', avg: 'R$ 200' },
  { name: 'Retorno + Ajuste de Dosagem', count: 41, revenue: 'R$ 8.200', avg: 'R$ 200' },
  { name: 'Protocolo Tireoide', count: 12, revenue: 'R$ 3.600', avg: 'R$ 300' },
]

const crmStages = [
  { stage: 'Novo', color: 'bg-[#52525B]', leads: [
    { name: 'João P.', value: 'R$ 12k', time: '2h' },
    { name: 'Carla M.', value: 'R$ 8k', time: '4h' },
    { name: 'André S.', value: 'R$ 6k', time: '1d' },
  ]},
  { stage: 'Qualificado', color: 'bg-[#3B82F6]', leads: [
    { name: 'Marina T.', value: 'R$ 15k', time: '1d' },
    { name: 'Paulo R.', value: 'R$ 10k', time: '2d' },
  ]},
  { stage: 'Proposta', color: 'bg-[#7B3FE4]', leads: [
    { name: 'Sofia L.', value: 'R$ 18k', time: '3d' },
    { name: 'Edu K.', value: 'R$ 9k', time: '3d' },
  ]},
  { stage: 'Fechado', color: 'bg-emerald-500', leads: [
    { name: 'Renata B.', value: 'R$ 14k', time: '5d' },
    { name: 'Marcos V.', value: 'R$ 11k', time: '6d' },
  ]},
]

const agents = [
  {
    name: 'ANA',
    role: 'Vendas & Qualificação',
    status: 'Ativa',
    metric: '23 atendimentos hoje',
    score: '100',
    scoreLabel: 'Excelente',
    color: 'from-[#7B3FE4] to-[#3B82F6]',
    active: true,
    log: [
      { text: 'Agendou Marina Souza — Implante Testosterona', time: '3h atrás' },
      { text: 'Qualificou lead Pedro R. — alto potencial', time: '5h atrás' },
      { text: 'Respondeu 12 mensagens WhatsApp', time: '6h atrás' },
    ],
  },
  {
    name: 'Gustavo',
    role: 'Tráfego & Mídias Digitais',
    status: 'Ativo',
    metric: '3 sugestões de conteúdo',
    score: '88',
    scoreLabel: 'Ótimo',
    color: 'from-[#3B82F6] to-[#06B6D4]',
    active: true,
    log: [
      { text: 'Criou calendário editorial para Agosto', time: '1d atrás' },
      { text: 'Analisou performance Instagram: +18% alcance', time: '2d atrás' },
    ],
  },
  {
    name: 'Lucas',
    role: 'Administrativo & Financeiro',
    status: 'Configuração pendente',
    metric: 'Configuração necessária',
    score: '—',
    scoreLabel: 'Inativo',
    color: 'from-amber-500 to-amber-600',
    active: false,
    log: [],
  },
  {
    name: 'Rafael',
    role: 'Jurídico & Compliance',
    status: 'Plano Elite',
    metric: 'Disponível no Plano Elite',
    score: '—',
    scoreLabel: 'Bloqueado',
    color: 'from-emerald-500 to-emerald-600',
    active: false,
    log: [],
  },
]

export default function NegocioPage() {
  const [tab, setTab] = useState<Tab>('financeiro')

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Meu Negócio" />
        <main className="flex-1 overflow-y-auto px-6 py-5">

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#111113] border border-[#1C1C1E] rounded-xl p-1 mb-5 w-fit">
            {([
              { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
              { id: 'crm', label: 'CRM', icon: Kanban },
              { id: 'agentes', label: 'Agentes IA', icon: Bot },
            ] as { id: Tab; label: string; icon: React.ElementType }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t.id
                    ? 'bg-[#7B3FE4] text-white shadow'
                    : 'text-[#71717A] hover:text-white hover:bg-[#18181A]'
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
              </button>
            ))}
          </div>

          {/* Financeiro tab */}
          {tab === 'financeiro' && (
            <div className="space-y-5">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Faturamento Julho', value: 'R$ 74k', trend: '+21%', color: 'text-emerald-400', icon: TrendingUp },
                  { label: 'Ticket Médio', value: 'R$ 8.4k', trend: '+12%', color: 'text-[#60A5FA]', icon: BarChart3 },
                  { label: 'Procedimentos', value: '167', trend: '+18', color: 'text-[#9558EE]', icon: Activity },
                  { label: 'MRR Estimado', value: 'R$ 22k', trend: 'recorrente', color: 'text-amber-400', icon: DollarSign },
                ].map((k, i) => (
                  <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <k.icon className={`w-4 h-4 ${k.color}`} />
                      <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                        <ArrowUpRight className="w-3 h-3" />{k.trend}
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-white">{k.value}</p>
                    <p className="text-[10px] text-[#52525B] mt-1 uppercase tracking-wide">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Revenue chart */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-white">Faturamento — Últimos 7 Meses</h3>
                  <span className="text-xs text-[#52525B]">em R$ mil</span>
                </div>
                <div className="flex items-end gap-3 h-36">
                  {barData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[10px] text-[#71717A]">R${d.value}k</span>
                      <div
                        className={`w-full rounded-t-md ${i === barData.length - 1 ? 'bg-gradient-to-t from-[#7B3FE4] to-[#9558EE]' : 'bg-[#27272A] hover:bg-[#3F3F46] transition-colors'}`}
                        style={{ height: `${(d.value / maxVal) * 100}px` }}
                      />
                      <span className="text-[10px] text-[#52525B]">{d.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Procedures table */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#1C1C1E]">
                  <h3 className="text-sm font-semibold text-white">Procedimentos — Julho 2026</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1C1C1E]">
                        {['Procedimento', 'Qtd', 'Receita', 'Ticket Médio'].map(h => (
                          <th key={h} className="text-left text-[10px] font-semibold text-[#52525B] uppercase tracking-wider px-5 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {procedures.map((p, i) => (
                        <tr key={i} className="border-b border-[#1C1C1E] last:border-0 hover:bg-[#18181A]/50 transition-colors">
                          <td className="px-5 py-3 text-sm text-[#A1A1AA]">{p.name}</td>
                          <td className="px-5 py-3 text-sm text-white font-semibold">{p.count}</td>
                          <td className="px-5 py-3 text-sm text-emerald-400 font-semibold">{p.revenue}</td>
                          <td className="px-5 py-3 text-sm text-[#71717A]">{p.avg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* CRM tab */}
          {tab === 'crm' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Pipeline de Leads</h3>
                <span className="text-xs text-[#52525B]">9 leads ativos · {crmStages.reduce((a, s) => a + s.leads.length, 0)} no funil</span>
              </div>
              {/* Kanban horizontal */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {crmStages.map((col, i) => (
                  <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
                    <div className={`px-4 py-3 border-b border-[#1C1C1E] flex items-center gap-2`}>
                      <div className={`w-2 h-2 rounded-full ${col.color}`} />
                      <span className="text-xs font-semibold text-[#A1A1AA]">{col.stage}</span>
                      <span className="ml-auto text-xs text-[#52525B]">{col.leads.length}</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {col.leads.map((lead, j) => (
                        <div key={j} className="bg-[#18181A] border border-[#1C1C1E] rounded-xl p-3 hover:border-[#7B3FE4]/30 transition-all cursor-pointer">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-white">{lead.name}</p>
                            <span className="text-[10px] text-emerald-400 font-semibold">{lead.value}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-[#52525B]">
                            <Clock className="w-2.5 h-2.5" /> {lead.time} atrás
                          </div>
                        </div>
                      ))}
                      <button className="w-full border border-dashed border-[#27272A] rounded-xl py-2 text-[10px] text-[#52525B] hover:border-[#7B3FE4]/30 hover:text-[#7B3FE4] transition-all">
                        + Adicionar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recent leads */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#1C1C1E]">
                  <h3 className="text-sm font-semibold text-white">Leads Recentes via ANA</h3>
                </div>
                <div className="divide-y divide-[#1C1C1E]">
                  {[
                    { name: 'Marina Souza', stage: 'Proposta', value: 'R$ 14k', source: 'WhatsApp · ANA', time: '3h' },
                    { name: 'Pedro Rodrigues', stage: 'Qualificado', value: 'R$ 9k', source: 'Instagram · ANA', time: '5h' },
                    { name: 'Carla Menezes', stage: 'Novo', value: 'R$ 7k', source: 'WhatsApp · ANA', time: '8h' },
                    { name: 'João Paulo', stage: 'Novo', value: 'R$ 12k', source: 'Indicação', time: '1d' },
                  ].map((l, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#18181A]/50 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {l.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{l.name}</p>
                        <p className="text-[10px] text-[#52525B]">{l.source} · {l.time} atrás</p>
                      </div>
                      <span className="text-xs text-[#71717A] hidden md:block">{l.stage}</span>
                      <span className="text-sm font-semibold text-emerald-400">{l.value}</span>
                      <ChevronRight className="w-4 h-4 text-[#52525B]" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Agentes tab */}
          {tab === 'agentes' && (
            <div className="grid md:grid-cols-2 gap-4">
              {agents.map((a, i) => (
                <div key={i} className={`bg-[#111113] border rounded-2xl p-5 ${a.active ? 'border-[#7B3FE4]/25' : 'border-[#1C1C1E]'}`}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${a.color} flex items-center justify-center flex-shrink-0 text-white font-bold text-lg shadow-lg ${!a.active ? 'opacity-40' : ''}`}>
                      {a.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="font-bold text-white">{a.name}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          a.active
                            ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                            : 'text-[#52525B] bg-[#1C1C1E] border border-[#27272A]'
                        }`}>{a.status}</span>
                      </div>
                      <p className="text-xs text-[#71717A]">{a.role}</p>
                    </div>
                    <button className="flex items-center gap-1.5 bg-[#18181A] border border-[#1C1C1E] text-[#71717A] hover:text-white hover:border-[#7B3FE4]/30 text-xs px-3 py-1.5 rounded-lg transition-all">
                      <Settings className="w-3.5 h-3.5" /> Configurar
                    </button>
                  </div>

                  {a.active && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2">
                        <p className="text-xs font-semibold text-white">{a.metric}</p>
                        <p className="text-[10px] text-[#52525B]">Métrica hoje</p>
                      </div>
                      <div className="bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2">
                        <p className="text-xs font-semibold text-[#9558EE]">Score {a.score}</p>
                        <p className="text-[10px] text-[#52525B]">{a.scoreLabel}</p>
                      </div>
                    </div>
                  )}

                  {a.log.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold text-[#52525B] uppercase tracking-wider">Atividade Recente</p>
                      {a.log.map((entry, j) => (
                        <div key={j} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3 h-3 text-[#7B3FE4] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[11px] text-[#A1A1AA]">{entry.text}</p>
                            <p className="text-[10px] text-[#52525B]">{entry.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-[#18181A] border border-dashed border-[#27272A] rounded-xl p-4 text-center">
                      <p className="text-xs text-[#52525B]">{a.metric}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
