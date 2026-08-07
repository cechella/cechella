'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { Bot, PhoneCall, Share2, Settings, ExternalLink, Activity, MessageSquare, Zap } from 'lucide-react'

interface AgentCard {
  icon: string
  name: string
  role: string
  status: 'online' | 'soon'
  color: string
  description: string
  metrics?: { label: string; value: string; color?: string }[]
  tools?: string[]
  links?: { label: string; href: string }[]
}

const agents: AgentCard[] = [
  {
    icon: '🎙️',
    name: 'Ana Voz',
    role: 'Agente de Voz — VAPI AI',
    status: 'online',
    color: '#7c5cfc',
    description: 'Conduz ligações automáticas para leads. Coleta nome, dor principal e fecha vendas pelo telefone com voz natural via ElevenLabs.',
    metrics: [
      { label: 'Ligações hoje', value: '—', color: '#7c5cfc' },
      { label: 'Taxa conversão', value: '—', color: '#22c55e' },
      { label: 'Etapa média', value: '—' },
    ],
    tools: ['Vapi AI', 'ElevenLabs', 'Supabase', 'Z-API', 'Twilio'],
    links: [
      { label: 'Configurar no Vapi', href: 'https://dashboard.vapi.ai' },
      { label: 'Fluxo n8n', href: 'https://n8n.hormoneecosystem.com' },
    ],
  },
  {
    icon: '💬',
    name: 'Ana WhatsApp',
    role: 'Agente de Mensagens — Z-API',
    status: 'online',
    color: '#22c55e',
    description: 'Atende leads pelo WhatsApp em 7 etapas: desde o primeiro contato até a coleta de indicações pós-venda. INTOCÁVEL — não alterar fluxo.',
    metrics: [
      { label: 'Msgs hoje', value: '—', color: '#22c55e' },
      { label: 'Leads ativos', value: '—', color: '#7c5cfc' },
      { label: 'Em atend. humano', value: '—' },
    ],
    tools: ['Z-API', 'n8n', 'Supabase', 'Claude API'],
    links: [
      { label: 'Ver no n8n', href: 'https://n8n.hormoneecosystem.com' },
      { label: 'Logs Z-API', href: 'https://app.z-api.io' },
    ],
  },
  {
    icon: '🔗',
    name: 'Ana Referidos',
    role: 'Agente de Indicações — Web',
    status: 'online',
    color: '#f59e0b',
    description: 'Gerencia o fluxo de indicações pós-compra. Envia link personalizado, tutorial em vídeo, recebe contatos via WhatsApp e rastreia progresso.',
    metrics: [
      { label: 'Indicações hoje', value: '—', color: '#f59e0b' },
      { label: 'Sessões ativas', value: '—', color: '#7c5cfc' },
      { label: 'Meta 20 atingida', value: '—' },
    ],
    tools: ['Z-API', 'Supabase', 'R2 Storage', 'n8n'],
    links: [
      { label: 'Página /indicar', href: 'https://www.hormoneecosystem.com/indicar' },
    ],
  },
]

const coming: { icon: string; name: string; desc: string }[] = [
  { icon: '🏥', name: 'Administrativo', desc: 'Agendamentos, confirmações e lembretes automatizados' },
  { icon: '💰', name: 'Financeiro', desc: 'Cobranças, inadimplência e renovações' },
  { icon: '🩺', name: 'Clínico', desc: 'Orientações pós-implante e acompanhamento de resultados' },
]

export default function AgentesPage() {
  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-[22px] font-bold text-white">Rede de Agentes</h1>
              <p className="text-sm text-[#71717A] mt-1">Configure e monitore todos os agentes de IA do ecossistema</p>
            </div>
            <div className="flex items-center gap-2 bg-[#131720] border border-[#252d42] rounded-full px-3 py-1.5 text-xs font-semibold text-[#22c55e]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
              3 agentes online
            </div>
          </div>

          {/* Active agents */}
          <p className="text-[10px] font-bold tracking-[0.1em] text-[#3F3F46] uppercase mb-3 flex items-center gap-2">
            Agentes Ativos
            <span className="flex-1 h-px bg-[#1C1C1E]" />
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            {agents.map((a) => (
              <div
                key={a.name}
                className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 hover:border-[#7B3FE4]/40 hover:shadow-[0_0_32px_rgba(123,63,228,0.12)] transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl"
                    style={{ background: `${a.color}20` }}
                  >
                    {a.icon}
                  </div>
                  <span className="flex items-center gap-1.5 bg-[#22c55e]/10 border border-[#22c55e]/25 text-[#22c55e] text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
                    Online
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">{a.name}</h3>
                <p className="text-[11px] text-[#71717A] mt-0.5 mb-3">{a.role}</p>
                <p className="text-xs text-[#8891a8] leading-relaxed mb-4">{a.description}</p>

                {a.metrics && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {a.metrics.map((m) => (
                      <div key={m.label} className="bg-[#18181A] rounded-lg p-2 text-center">
                        <p className="text-base font-bold font-mono" style={{ color: m.color || '#e2e5f0' }}>{m.value}</p>
                        <p className="text-[9px] text-[#3F3F46] uppercase tracking-wider mt-0.5 leading-tight">{m.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {a.tools && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {a.tools.map((t) => (
                      <span key={t} className="bg-[#18181A] border border-[#1C1C1E] rounded px-2 py-0.5 text-[10px] text-[#71717A] font-mono">{t}</span>
                    ))}
                  </div>
                )}

                {a.links && (
                  <div className="flex gap-2">
                    {a.links.map((l) => (
                      <a
                        key={l.label}
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium bg-[#18181A] border border-[#1C1C1E] text-[#71717A] hover:text-white hover:border-[#7B3FE4]/40 transition-all"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {l.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Coming soon */}
          <p className="text-[10px] font-bold tracking-[0.1em] text-[#3F3F46] uppercase mb-3 flex items-center gap-2">
            Em Breve
            <span className="flex-1 h-px bg-[#1C1C1E]" />
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {coming.map((c) => (
              <div
                key={c.name}
                className="bg-[#111113] border border-dashed border-[#1C1C1E] rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-3 min-h-[160px] cursor-not-allowed"
              >
                <span className="text-3xl opacity-30">{c.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-[#3F3F46]">{c.name}</p>
                  <p className="text-[11px] text-[#2D2D32] mt-1">{c.desc}</p>
                </div>
                <span className="text-[9px] font-bold tracking-widest text-[#3F3F46] bg-[#18181A] px-2.5 py-1 rounded uppercase">Em breve</span>
              </div>
            ))}
          </div>

        </main>
      </div>
    </div>
  )
}
