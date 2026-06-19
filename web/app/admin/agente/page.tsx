'use client'

import { useState, useEffect, useCallback, useRef, Component, ReactNode } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import { RefreshCw, Bot, User, MessageSquare } from 'lucide-react'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { error: error.message }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center bg-[#0A0A0B] p-8">
          <div className="text-center max-w-lg">
            <p className="text-red-400 text-sm font-mono mb-2">Erro capturado:</p>
            <p className="text-white text-xs font-mono bg-[#1C1C1E] p-4 rounded-lg">{this.state.error}</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

interface MsgHistorico {
  role: 'user' | 'assistant'
  content: string
  ts?: string
}

interface LeadAgente {
  id: string
  telefone: string
  nome: string | null
  etapa: string | null
  etapa_agente: number | null
  temperatura: string
  dor_principal: string | null
  historico: MsgHistorico[]
  updated_at: string
}

const ETAPAS = [
  { n: 1, label: 'Apresentação' },
  { n: 2, label: 'Conexão' },
  { n: 3, label: 'D.I.' },
  { n: 4, label: 'Speech' },
  { n: 5, label: 'Fechamento' },
  { n: 6, label: 'Referidos' },
  { n: 7, label: 'Validação' },
]

const ETAPA_TITLES: Record<number, string> = {
  1: 'ETAPA 1 — Apresentação',
  2: 'ETAPA 2 — Conexão',
  3: 'ETAPA 3 — D.I. (Combinado)',
  4: 'ETAPA 4 — Speech do Produto',
  5: 'ETAPA 5 — Fechamento',
  6: 'ETAPA 6 — Referidos',
  7: 'ETAPA 7 — Validação',
}

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  return new Date(ts).toLocaleDateString('pt-BR')
}

function formatTime(ts?: string) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function TempBadge({ t }: { t: string }) {
  const styles: Record<string, string> = {
    quente: 'bg-red-500/20 text-red-400',
    morno: 'bg-yellow-500/20 text-yellow-400',
    frio: 'bg-blue-500/20 text-blue-400',
  }
  const icons: Record<string, string> = { quente: '🔥', morno: '🟡', frio: '❄️' }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${styles[t] || 'bg-zinc-500/20 text-zinc-400'}`}>
      {icons[t] || ''} {t}
    </span>
  )
}

export default function AgenteAdminPage() {
  const [leads, setLeads] = useState<LeadAgente[]>([])
  const [selected, setSelected] = useState<LeadAgente | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const selectedRef = useRef<LeadAgente | null>(null)
  selectedRef.current = selected

  const supabase = useRef(createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )).current

  const fetchLeads = useCallback(async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, telefone, nome, etapa, etapa_agente, temperatura, dor_principal, historico, updated_at')
      .not('historico', 'eq', '[]')
      .not('historico', 'is', null)
      .order('updated_at', { ascending: false })

    if (data) {
      setLeads(data as LeadAgente[])
      if (selectedRef.current) {
        const updated = (data as LeadAgente[]).find(l => l.id === selectedRef.current!.id)
        if (updated) setSelected(updated)
      }
      setLastUpdate(new Date())
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchLeads()
    const interval = setInterval(fetchLeads, 5000)
    return () => clearInterval(interval)
  }, [fetchLeads])

  const etapaAtual = selected?.etapa_agente || 1
  const historico = selected?.historico || []

  return (
    <ErrorBoundary>
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Agente WhatsApp — Monitor em Tempo Real" />
        <div className="flex flex-1 overflow-hidden">

          {/* Sidebar de leads */}
          <div className="w-72 border-r border-[#1C1C1E] flex flex-col bg-[#0D0D0F]">
            <div className="px-4 py-3 border-b border-[#1C1C1E] flex items-center justify-between">
              <span className="text-xs text-[#71717A] uppercase tracking-wider">
                {leads.length} leads ativos
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#71717A]">
                  {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#333]" />
                  <p className="text-sm text-[#444]">Nenhuma conversa ainda</p>
                  <p className="text-xs text-[#333] mt-1">Aguardando mensagens no WhatsApp</p>
                </div>
              ) : (
                leads.map(lead => {
                  const etapa = lead.etapa_agente || 1
                  const nome = lead.nome || lead.telefone
                  const isActive = selected?.id === lead.id
                  const historicoValido = Array.isArray(lead.historico) ? lead.historico.filter(m => m && m.content) : []
                  const lastMsg = historicoValido[historicoValido.length - 1]

                  return (
                    <button
                      key={lead.id}
                      onClick={() => setSelected(lead)}
                      className={`w-full text-left px-4 py-3.5 border-b border-[#1A1A1C] transition-all ${
                        isActive ? 'bg-[#1A1A2E] border-l-2 border-l-[#7B3FE4]' : 'hover:bg-[#141416]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium text-white truncate max-w-[150px]">{nome}</span>
                        <TempBadge t={lead.temperatura} />
                      </div>
                      <p className="text-xs text-[#71717A] mb-2 truncate">
                        {lastMsg?.content?.substring(0, 50) || 'Sem mensagens'}
                        {(lastMsg?.content?.length || 0) > 50 ? '...' : ''}
                      </p>

                      {/* Mini barra 7 etapas */}
                      <div className="flex gap-1 mb-1">
                        {ETAPAS.map(e => (
                          <div
                            key={e.n}
                            className={`flex-1 h-1 rounded-full transition-all ${
                              e.n < etapa ? 'bg-green-500' :
                              e.n === etapa ? 'bg-[#7B3FE4]' : 'bg-[#2a2a2a]'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#7B3FE4] font-medium">
                          {ETAPA_TITLES[etapa]}
                        </span>
                        <span className="text-[10px] text-[#444]">{timeAgo(lead.updated_at)}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Painel principal */}
          {selected ? (
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* Header do lead */}
              <div className="px-6 py-4 border-b border-[#1C1C1E] bg-[#0D0D0F]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-white">
                      {selected.nome || selected.telefone}
                    </h2>
                    <p className="text-xs text-[#71717A] mt-0.5">
                      {selected.telefone}
                      {selected.dor_principal && ` · Dor: ${selected.dor_principal}`}
                    </p>
                  </div>
                  <button
                    onClick={fetchLeads}
                    className="p-2 text-[#71717A] hover:text-white hover:bg-[#1C1C1E] rounded-lg transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Timeline 7 etapas */}
              <div className="px-6 py-4 border-b border-[#1A1A1C] bg-[#0A0A0B] overflow-x-auto">
                <div className="flex items-start gap-0 min-w-max">
                  {ETAPAS.map((e, i) => {
                    const isDone = e.n < etapaAtual
                    const isActive = e.n === etapaAtual

                    return (
                      <div key={e.n} className="flex items-start">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                            isDone ? 'bg-green-900/50 border-green-500 text-green-400' :
                            isActive ? 'bg-[#7B3FE4]/30 border-[#7B3FE4] text-white shadow-[0_0_12px_rgba(123,63,228,0.4)]' :
                            'bg-[#1C1C1E] border-[#333] text-[#555]'
                          }`}>
                            {isDone ? '✓' : e.n}
                          </div>
                          <span className={`text-[9px] mt-1.5 text-center w-14 leading-tight ${
                            isActive ? 'text-[#A78BFA]' : isDone ? 'text-green-600' : 'text-[#444]'
                          }`}>
                            {e.label}
                          </span>
                        </div>
                        {i < 6 && (
                          <div className={`w-12 h-0.5 mt-4 mx-1 ${isDone ? 'bg-green-500' : 'bg-[#2a2a2a]'}`} />
                        )}
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-[#7B3FE4] font-medium mt-3">
                  {ETAPA_TITLES[etapaAtual]}
                </p>
              </div>

              {/* Chat */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                {historico.length === 0 ? (
                  <div className="text-center py-12 text-[#444]">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Sem mensagens</p>
                  </div>
                ) : (
                  historico.filter(msg => msg && msg.role && msg.content).map((msg, i) => {
                    const isUser = msg.role === 'user'
                    return (
                      <div key={i} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        {!isUser && (
                          <div className="w-7 h-7 rounded-full bg-[#7B3FE4]/20 border border-[#7B3FE4]/30 flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot className="w-3.5 h-3.5 text-[#A78BFA]" />
                          </div>
                        )}
                        <div className={`max-w-[70%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                            isUser
                              ? 'bg-green-900/40 text-green-100 border border-green-800/50 rounded-br-sm'
                              : 'bg-[#1C1C1E] text-[#E4E4E7] border border-[#2a2a2a] rounded-bl-sm'
                          }`}>
                            {String(msg.content || '')}
                          </div>
                          {msg.ts && (
                            <span className="text-[10px] text-[#444] mt-1 px-1">{formatTime(msg.ts)}</span>
                          )}
                        </div>
                        {isUser && (
                          <div className="w-7 h-7 rounded-full bg-green-900/30 border border-green-800/50 flex items-center justify-center flex-shrink-0 mt-1">
                            <User className="w-3.5 h-3.5 text-green-400" />
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Bot className="w-12 h-12 mx-auto mb-3 text-[#2a2a2a]" />
                <p className="text-sm text-[#444]">Selecione um lead para ver o chat</p>
                <p className="text-xs text-[#333] mt-1">Atualiza a cada 5 segundos</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </ErrorBoundary>
  )
}
