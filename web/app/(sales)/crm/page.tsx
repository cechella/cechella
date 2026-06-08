'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Badge } from '@/components/ui/Badge'
import { Plus, MoreHorizontal, Clock, Instagram, Globe, MessageCircle, Phone, User } from 'lucide-react'

type Stage = 'Lead' | 'Qualificado' | 'Consulta' | 'Tratamento' | 'Renovação'

interface Lead {
  id: number
  name: string
  age: number
  source: string
  date: string
  value: string
  assigned: string
  tags: string[]
  urgent?: boolean
}

const columns: { id: Stage; label: string; color: string; accent: string }[] = [
  { id: 'Lead', label: 'Lead', color: 'bg-[#7B3FE4]/10', accent: '#7B3FE4' },
  { id: 'Qualificado', label: 'Qualificado', color: 'bg-[#3B82F6]/10', accent: '#3B82F6' },
  { id: 'Consulta', label: 'Consulta', color: 'bg-[#06B6D4]/10', accent: '#06B6D4' },
  { id: 'Tratamento', label: 'Tratamento', color: 'bg-emerald-500/10', accent: '#10B981' },
  { id: 'Renovação', label: 'Renovação', color: 'bg-amber-500/10', accent: '#F59E0B' },
]

const sourceIcons: Record<string, React.ReactNode> = {
  'Instagram': <Instagram className="w-3 h-3" />,
  'Google': <Globe className="w-3 h-3" />,
  'WhatsApp': <MessageCircle className="w-3 h-3" />,
  'Indicação': <User className="w-3 h-3" />,
  'Telefone': <Phone className="w-3 h-3" />,
}

const initialLeads: Record<Stage, Lead[]> = {
  Lead: [
    { id: 1, name: 'Ana Paula M.', age: 48, source: 'Instagram', date: 'Hoje', value: 'R$ 4.800', assigned: 'Juliana', tags: ['Menopausa'], urgent: true },
    { id: 2, name: 'Sandra Kowalski', age: 52, source: 'Google', date: 'Ontem', value: 'R$ 4.800', assigned: 'Juliana', tags: ['TRH'] },
    { id: 3, name: 'Renata Borges', age: 44, source: 'WhatsApp', date: '2 dias', value: 'R$ 4.800', assigned: 'Juliana', tags: ['Libido'] },
    { id: 4, name: 'Marcos Vinicius', age: 55, source: 'Indicação', date: '3 dias', value: 'R$ 6.200', assigned: 'Juliana', tags: ['Andropausa'] },
  ],
  Qualificado: [
    { id: 5, name: 'Carlos Eduardo S.', age: 51, source: 'Indicação', date: 'Ontem', value: 'R$ 6.200', assigned: 'Juliana', tags: ['TRT'] },
    { id: 6, name: 'Patricia Gomes', age: 47, source: 'Instagram', date: '2 dias', value: 'R$ 4.800', assigned: 'Juliana', tags: ['Menopausa'] },
    { id: 7, name: 'Roberto Almeida', age: 58, source: 'Google', date: '4 dias', value: 'R$ 6.200', assigned: 'Juliana', tags: ['Performance'] },
  ],
  Consulta: [
    { id: 8, name: 'Marcia Lima', age: 49, source: 'WhatsApp', date: 'Ontem', value: 'R$ 4.800', assigned: 'Juliana', tags: ['Hormônios'], urgent: true },
    { id: 9, name: 'Fernando Costa', age: 53, source: 'Telefone', date: '3 dias', value: 'R$ 6.200', assigned: 'Juliana', tags: ['TRT'] },
  ],
  Tratamento: [
    { id: 10, name: 'Roberto Farias', age: 50, source: 'WhatsApp', date: '5 dias', value: 'R$ 9.600', assigned: 'Juliana', tags: ['Implante'] },
    { id: 11, name: 'Claudia Neves', age: 46, source: 'Indicação', date: '1 sem', value: 'R$ 4.800', assigned: 'Juliana', tags: ['Implante Fem'] },
    { id: 12, name: 'Henrique Torres', age: 48, source: 'Instagram', date: '1 sem', value: 'R$ 9.600', assigned: 'Juliana', tags: ['Implante Masc'] },
  ],
  Renovação: [
    { id: 13, name: 'Monica Souza', age: 54, source: 'Indicação', date: '3 meses', value: 'R$ 4.800', assigned: 'Juliana', tags: ['Renovação'] },
    { id: 14, name: 'André Ribeiro', age: 49, source: 'Indicação', date: '4 meses', value: 'R$ 6.200', assigned: 'Juliana', tags: ['Renovação'] },
  ],
}

function LeadCard({ lead, accent }: { lead: Lead; accent: string }) {
  return (
    <div className={`bg-[#111113] border rounded-xl p-3 cursor-grab hover:border-opacity-60 transition-all hover:-translate-y-0.5 shadow-[0_2px_12px_rgba(0,0,0,0.3)] ${
      lead.urgent ? 'border-amber-500/30' : 'border-[#1C1C1E]'
    }`}>
      {lead.urgent && (
        <div className="flex items-center gap-1 text-[10px] font-bold text-amber-400 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Urgente
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{lead.name}</p>
          <p className="text-xs text-[#71717A]">{lead.age} anos</p>
        </div>
        <button className="text-[#52525B] hover:text-white transition-colors flex-shrink-0">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-1 mt-2 flex-wrap">
        {lead.tags.map(tag => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-md text-[#71717A] bg-[#18181A] border border-[#1C1C1E]">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1C1C1E]">
        <div className="flex items-center gap-1 text-[10px] text-[#52525B]">
          {sourceIcons[lead.source] || <User className="w-3 h-3" />}
          <span>{lead.source}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[#52525B]">
          <Clock className="w-2.5 h-2.5" />
          <span>{lead.date}</span>
        </div>
      </div>

      <div className="mt-2 text-xs font-bold" style={{ color: accent }}>{lead.value}</div>
    </div>
  )
}

export default function CRMPage() {
  const [leads] = useState(initialLeads)

  const totalValue = Object.values(leads).flat().reduce((acc, l) => {
    return acc + parseInt(l.value.replace(/[^0-9]/g, ''))
  }, 0)

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="sales" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Juliana Martins', role: 'sales' }} title="CRM Pipeline" />
        <div className="px-6 py-4 border-b border-[#1C1C1E] bg-[#111113]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[#71717A]">Total de leads:</span>
              <span className="font-bold text-white">{Object.values(leads).flat().length}</span>
              <span className="text-[#1C1C1E]">|</span>
              <span className="text-[#71717A]">Receita potencial:</span>
              <span className="font-bold text-emerald-400">R$ {(totalValue / 1000).toFixed(0)}k</span>
            </div>
            <button className="flex items-center gap-2 bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-[0_0_10px_rgba(123,63,228,0.3)]">
              <Plus className="w-4 h-4" /> Novo Lead
            </button>
          </div>
        </div>

        {/* Kanban board */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex gap-4 h-full min-w-max">
            {columns.map((col) => {
              const colLeads = leads[col.id] || []
              return (
                <div key={col.id} className="w-64 flex flex-col h-full">
                  {/* Column header */}
                  <div className={`${col.color} border rounded-xl px-3 py-2.5 mb-3 flex items-center justify-between`} style={{ borderColor: `${col.accent}30` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: col.accent }} />
                      <span className="text-sm font-semibold text-white">{col.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white bg-[#111113]/60 px-2 py-0.5 rounded-full">
                        {colLeads.length}
                      </span>
                      <button className="text-[#52525B] hover:text-white transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto space-y-2 kanban-column no-scrollbar">
                    {colLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} accent={col.accent} />
                    ))}
                    <button className="w-full py-2.5 border border-dashed border-[#1C1C1E] rounded-xl text-xs text-[#52525B] hover:text-[#71717A] hover:border-[#27272A] transition-all">
                      + Adicionar card
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
