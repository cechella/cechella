'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Kanban, Plus, Search, Filter, ChevronRight,
  MessageSquare, Clock, DollarSign, User, Bot,
  Phone, Mail, ArrowUpRight, MoreHorizontal,
} from 'lucide-react'

const columns = [
  {
    id: 'novo', label: 'Novo', color: 'text-[#71717A]', dot: 'bg-[#52525B]',
    leads: [
      { name: 'Marcos Oliveira', source: 'ANA · Instagram', value: 'R$ 8.4k', time: '1h', avatar: 'MO', hot: true },
      { name: 'Patricia Lemos', source: 'ANA · WhatsApp', value: 'R$ 12k', time: '3h', avatar: 'PL', hot: false },
      { name: 'Roberto Santos', source: 'Indicação', value: 'R$ 6k', time: '5h', avatar: 'RS', hot: false },
      { name: 'Ana Beatriz Lima', source: 'ANA · Facebook', value: 'R$ 8.4k', time: '1d', avatar: 'AB', hot: false },
    ],
  },
  {
    id: 'qualificado', label: 'Qualificado', color: 'text-[#60A5FA]', dot: 'bg-[#3B82F6]',
    leads: [
      { name: 'Juliana Ferreira', source: 'ANA · WhatsApp', value: 'R$ 12k', time: '2d', avatar: 'JF', hot: true },
      { name: 'Carlos Mendes', source: 'Indicação', value: 'R$ 9k', time: '3d', avatar: 'CM', hot: false },
      { name: 'Renata Costas', source: 'Google Ads', value: 'R$ 8.4k', time: '4d', avatar: 'RC', hot: false },
    ],
  },
  {
    id: 'educacao', label: 'Educação', color: 'text-[#A78BFA]', dot: 'bg-[#7B3FE4]',
    leads: [
      { name: 'Fernanda Alves', source: 'ANA · WhatsApp', value: 'R$ 15k', time: '5d', avatar: 'FA', hot: true },
      { name: 'Diego Nascimento', source: 'Indicação', value: 'R$ 12k', time: '7d', avatar: 'DN', hot: false },
    ],
  },
  {
    id: 'proposta', label: 'Proposta', color: 'text-amber-400', dot: 'bg-amber-500',
    leads: [
      { name: 'Marina Torres', source: 'ANA · Instagram', value: 'R$ 12k', time: '8d', avatar: 'MT', hot: true },
      { name: 'Paulo Saito', source: 'Indicação', value: 'R$ 18k', time: '10d', avatar: 'PS', hot: false },
    ],
  },
  {
    id: 'fechado', label: 'Fechado', color: 'text-emerald-400', dot: 'bg-emerald-500',
    leads: [
      { name: 'Camila Rocha', source: 'ANA · WhatsApp', value: 'R$ 12k', time: '14d', avatar: 'CR', hot: false },
      { name: 'Thiago Borges', source: 'Indicação', value: 'R$ 8.4k', time: '18d', avatar: 'TB', hot: false },
      { name: 'Larissa Costa', source: 'Google Ads', value: 'R$ 15k', time: '22d', avatar: 'LC', hot: false },
    ],
  },
]

const kpis = [
  { label: 'Total no Funil', value: '37', sub: 'leads ativos', color: 'text-white' },
  { label: 'Valor no Pipeline', value: 'R$ 312k', sub: 'potencial', color: 'text-emerald-400' },
  { label: 'Taxa Conversão', value: '34%', sub: '+6pp mês ant', color: 'text-[#7B3FE4]' },
  { label: 'Ticket Médio', value: 'R$ 8.4k', sub: 'por paciente', color: 'text-amber-400' },
]

export default function CRMPage() {
  const [search, setSearch] = useState('')

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="CRM — Pipeline de Pacientes" />
        <main className="flex-1 overflow-y-auto px-6 py-5">

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2">
              <Kanban className="w-5 h-5 text-[#7B3FE4]" />
              <div>
                <h2 className="text-base font-bold text-white">Kanban de Leads</h2>
                <p className="text-xs text-[#52525B]">Gerenciado por ANA · atualizado em tempo real</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#111113] border border-[#1C1C1E] rounded-xl px-3 py-2">
                <Search className="w-3.5 h-3.5 text-[#52525B]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar lead..."
                  className="bg-transparent text-xs text-white placeholder-[#52525B] outline-none w-32"
                />
              </div>
              <button className="flex items-center gap-1.5 bg-[#111113] border border-[#1C1C1E] text-[#A1A1AA] hover:text-white text-xs px-3 py-2 rounded-xl transition-colors">
                <Filter className="w-3.5 h-3.5" /> Filtrar
              </button>
              <button className="flex items-center gap-1.5 bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white text-xs font-semibold px-3 py-2 rounded-xl hover:opacity-90 transition-opacity">
                <Plus className="w-3.5 h-3.5" /> Novo Lead
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {kpis.map((k, i) => (
              <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-3">
                <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-[#52525B] mt-0.5">{k.sub}</p>
                <p className="text-[9px] text-[#3F3F46] mt-1.5 uppercase tracking-wide">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Kanban board */}
          <div className="flex gap-3 overflow-x-auto pb-4" style={{ minWidth: 0 }}>
            {columns.map(col => {
              const filtered = col.leads.filter(l =>
                !search || l.name.toLowerCase().includes(search.toLowerCase())
              )
              const colTotal = col.leads.reduce((acc, l) => {
                const num = parseFloat(l.value.replace('R$ ', '').replace('k', '')) * 1000
                return acc + num
              }, 0)
              return (
                <div key={col.id} className="flex-shrink-0 w-60">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
                      <span className="text-[10px] text-[#52525B] bg-[#18181A] px-1.5 py-0.5 rounded-full">{col.leads.length}</span>
                    </div>
                    <span className="text-[10px] text-[#52525B]">R$ {(colTotal / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="space-y-2">
                    {filtered.map((lead, i) => (
                      <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-3 hover:border-[#7B3FE4]/30 transition-colors cursor-pointer group">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7B3FE4]/40 to-[#3B82F6]/40 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                              {lead.avatar}
                            </div>
                            <div>
                              <p className="text-xs font-medium text-white leading-tight">{lead.name}</p>
                              {lead.hot && <span className="text-[9px] text-amber-400">🔥 Quente</span>}
                            </div>
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="w-3.5 h-3.5 text-[#52525B]" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Bot className="w-3 h-3 text-[#7B3FE4]" />
                            <span className="text-[9px] text-[#52525B]">{lead.source}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-400">{lead.value}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Clock className="w-2.5 h-2.5 text-[#3F3F46]" />
                          <span className="text-[9px] text-[#3F3F46]">{lead.time}</span>
                        </div>
                      </div>
                    ))}
                    <button className="w-full flex items-center gap-1.5 text-[#52525B] hover:text-[#71717A] text-xs py-2 px-3 rounded-xl border border-dashed border-[#27272A] hover:border-[#3F3F46] transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Adicionar lead
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ANA status */}
          <div className="bg-gradient-to-r from-[#7B3FE4]/10 to-[#3B82F6]/5 border border-[#7B3FE4]/20 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center shadow-[0_0_15px_rgba(123,63,228,0.3)]">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">ANA está gerenciando seu funil automaticamente</p>
                <p className="text-xs text-[#71717A] mt-0.5">23 atendimentos hoje · 7 leads ativos · 107% taxa resposta · Score 100</p>
              </div>
              <a href="/medical/negocio?tab=agentes" className="flex-shrink-0 flex items-center gap-1.5 bg-[#18181A] border border-[#1C1C1E] text-[#A1A1AA] hover:text-white text-xs px-3 py-2 rounded-xl transition-colors">
                Configurar ANA <ChevronRight className="w-3 h-3" />
              </a>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
