'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Bot, Zap, TrendingUp, Shield, BarChart3,
  MessageSquare, ChevronRight, Activity, Clock,
  Settings, CheckCircle2, AlertCircle, Play, Pause,
} from 'lucide-react'

const agents = [
  {
    id: 'ana',
    name: 'ANA',
    role: 'Vendas & Qualificação',
    desc: 'Agente de atendimento, qualificação de leads e gestão do funil de vendas via WhatsApp e redes sociais.',
    color: 'from-[#7B3FE4] to-[#3B82F6]',
    border: 'border-[#7B3FE4]/30',
    active: true,
    score: 100,
    scoreLabel: 'Excelente',
    metrics: [
      { label: 'Conversas ativas', value: '2' },
      { label: 'Mensagens hoje', value: '31' },
      { label: 'Taxa resposta', value: '107%' },
      { label: 'Leads no funil', value: '7' },
    ],
    activity: [
      { text: 'Marina Souza qualificada — Implante Testosterona', time: '3h atrás' },
      { text: 'Roberto Santos — proposta enviada R$ 8.4k', time: '5h atrás' },
      { text: 'Juliana Ferreira — agendamento confirmado', time: '1d atrás' },
    ],
  },
  {
    id: 'gustavo',
    name: 'Gustavo',
    role: 'Tráfego & Mídias Digitais',
    desc: 'Gestor de tráfego pago, mídias sociais e estratégia de conteúdo para captação orgânica e paga.',
    color: 'from-[#3B82F6] to-[#06B6D4]',
    border: 'border-[#3B82F6]/30',
    active: true,
    score: 82,
    scoreLabel: 'Bom',
    metrics: [
      { label: 'Campanhas ativas', value: '3' },
      { label: 'CPL médio', value: 'R$ 48' },
      { label: 'ROAS', value: '4.2x' },
      { label: 'Novos leads/sem', value: '14' },
    ],
    activity: [
      { text: '3 sugestões de criativos para Instagram', time: '2h atrás' },
      { text: 'Campanha Google Ads otimizada — CPL -12%', time: '1d atrás' },
      { text: 'Relatório semanal de mídias entregue', time: '3d atrás' },
    ],
  },
  {
    id: 'lucas',
    name: 'Lucas',
    role: 'Administrativo & Financeiro',
    desc: 'Organiza documentos, categoriza despesas, gera relatórios financeiros e acompanha metas do consultório.',
    color: 'from-amber-500 to-amber-600',
    border: 'border-amber-500/30',
    active: false,
    score: null,
    scoreLabel: 'Configuração pendente',
    metrics: [
      { label: 'Despesas categ.', value: 'R$ 3.2k' },
      { label: 'Docs organizados', value: '—' },
      { label: 'Relatórios', value: '—' },
      { label: 'Alertas', value: '1' },
    ],
    activity: [
      { text: 'R$ 3.200 em despesas identificadas e categorizáveis', time: '1d atrás' },
    ],
  },
  {
    id: 'rafael',
    name: 'Rafael',
    role: 'Jurídico & Compliance',
    desc: 'Monitora resoluções CFM, mantém documentação regulatória atualizada e gera checklists de compliance.',
    color: 'from-emerald-500 to-emerald-600',
    border: 'border-emerald-500/30',
    active: false,
    score: null,
    scoreLabel: 'Plano Elite',
    metrics: [
      { label: 'Resoluções monit.', value: '12' },
      { label: 'Alertas ativos', value: '1' },
      { label: 'Docs atualizados', value: '—' },
      { label: 'Checklists', value: '3' },
    ],
    activity: [
      { text: 'Nova resolução CFM — checklist de compliance atualizado', time: '3d atrás' },
    ],
  },
]

export default function AgentePage() {
  const [selected, setSelected] = useState('ana')
  const agent = agents.find(a => a.id === selected)!

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Agentes de IA" />
        <main className="flex-1 overflow-y-auto px-6 py-5">

          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center shadow-[0_0_20px_rgba(123,63,228,0.3)]">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Seus Agentes de IA</h2>
              <p className="text-xs text-[#52525B]">4 agentes gerenciando seu negócio 24h · 7 dias</p>
            </div>
          </div>

          {/* Agent tabs */}
          <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
            {agents.map(a => (
              <button
                key={a.id}
                onClick={() => setSelected(a.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-all ${
                  selected === a.id
                    ? `bg-gradient-to-r ${a.color} text-white shadow-[0_0_12px_rgba(123,63,228,0.25)]`
                    : 'bg-[#111113] border border-[#1C1C1E] text-[#71717A] hover:text-white'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${a.active ? 'bg-emerald-400' : 'bg-[#52525B]'}`} />
                {a.name}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            {/* Agent main card */}
            <div className="lg:col-span-2 space-y-4">
              <div className={`bg-[#111113] border ${agent.border} rounded-2xl p-5`}>
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${agent.color} flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(123,63,228,0.25)]`}>
                      <Bot className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-white">{agent.name}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                          agent.active
                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                            : 'text-[#52525B] bg-[#18181A] border-[#27272A]'
                        }`}>{agent.active ? 'Ativo' : 'Inativo'}</span>
                        {agent.score !== null && (
                          <span className="text-[10px] text-[#7B3FE4] bg-[#7B3FE4]/10 px-2 py-0.5 rounded-full border border-[#7B3FE4]/20">
                            Score {agent.score} · {agent.scoreLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#71717A]">{agent.role}</p>
                      <p className="text-xs text-[#52525B] mt-1 leading-relaxed">{agent.desc}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl transition-all ${
                      agent.active
                        ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                        : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                    }`}>
                      {agent.active ? <><Pause className="w-3.5 h-3.5" /> Pausar</> : <><Play className="w-3.5 h-3.5" /> Ativar</>}
                    </button>
                    <button className="flex items-center gap-1.5 bg-[#18181A] border border-[#1C1C1E] text-[#71717A] hover:text-white text-xs px-3 py-2 rounded-xl transition-colors">
                      <Settings className="w-3.5 h-3.5" /> Configurar
                    </button>
                  </div>
                </div>

                {/* Metrics grid */}
                <div className="grid grid-cols-4 gap-3">
                  {agent.metrics.map((m, i) => (
                    <div key={i} className="bg-[#18181A] border border-[#1C1C1E] rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-white">{m.value}</p>
                      <p className="text-[9px] text-[#52525B] mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Atividade */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#7B3FE4]" /> Atividade Recente
                </h3>
                {agent.activity.length > 0 ? (
                  <div className="space-y-3">
                    {agent.activity.map((act, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${agent.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-[#A1A1AA]">{act.text}</p>
                          <p className="text-[10px] text-[#52525B] mt-0.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />{act.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#52525B]">Nenhuma atividade registrada.</p>
                )}
              </div>
            </div>

            {/* Right: all agents summary */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Status Geral</h3>
              <div className="space-y-2">
                {agents.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setSelected(a.id)}
                    className={`w-full bg-[#111113] border rounded-xl p-3 text-left transition-all hover:border-[#7B3FE4]/30 ${
                      selected === a.id ? 'border-[#7B3FE4]/30' : 'border-[#1C1C1E]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${a.color} flex items-center justify-center flex-shrink-0`}>
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-semibold text-white">{a.name}</p>
                          <div className={`w-1.5 h-1.5 rounded-full ${a.active ? 'bg-emerald-400' : 'bg-[#52525B]'}`} />
                        </div>
                        <p className="text-[10px] text-[#52525B] truncate">{a.role}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#52525B]" />
                    </div>
                  </button>
                ))}
              </div>

              {/* Score card */}
              <div className="mt-4 bg-gradient-to-br from-[#7B3FE4]/10 to-[#3B82F6]/5 border border-[#7B3FE4]/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-[#7B3FE4]" />
                  <span className="text-xs font-semibold text-[#7B3FE4] uppercase tracking-wider">Saúde dos Agentes</span>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-white">100</span>
                  <span className="text-xs text-emerald-400 mb-1">Excelente · ANA</span>
                </div>
                <p className="text-[11px] text-[#71717A] mt-1">2 de 4 agentes ativos. Ative Lucas e Rafael para maximizar seu negócio.</p>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
