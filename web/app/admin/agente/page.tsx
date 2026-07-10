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

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null
function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseClient
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
  atendimento_humano: boolean
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

// SLA em minutos por etapa — tempo máximo aceitável sem resposta
const SLA_ETAPA: Record<number, number> = {
  1: 30,   // Apresentação
  2: 60,   // Conexão
  3: 60,   // D.I.
  4: 30,   // Speech
  5: 20,   // Fechamento ← mais crítico
  6: 120,  // Referidos
  7: 240,  // Validação
}

const RISCO_KEYWORDS = ['não quero', 'nao quero', 'me tira', 'cancela', 'cancelar', 'desistir', 'desisti', 'golpe', 'fraude', 'enganando', 'mentira', 'reclamar', 'procon', 'reclame aqui', 'processo', 'advogado', 'caro demais', 'muito caro', 'não tenho dinheiro', 'sem dinheiro', 'não posso', 'nao posso', 'para de me', 'me deixa', 'não me mande', 'nao me mande', 'bloquear', 'bloqueia']
const HESITANTE_KEYWORDS = ['não sei', 'nao sei', 'talvez', 'vou pensar', 'deixa eu pensar', 'depois', 'semana que vem', 'mês que vem', 'não tenho certeza', 'nao tenho certeza', 'meu marido', 'minha família', 'preciso falar', 'muito caro', 'caro', 'parcelado', 'desconto', 'funciona mesmo', 'tem resultado', 'é seguro', 'e seguro']

function scoreRisco(historico: MsgHistorico[]): { nivel: 'risco' | 'hesitante' | 'interessado', label: string, cor: string } {
  const textoUser = historico
    .filter(m => m.role === 'user')
    .map(m => m.content?.toLowerCase() || '')
    .join(' ')

  if (RISCO_KEYWORDS.some(k => textoUser.includes(k))) {
    return { nivel: 'risco', label: '🔴 Risco', cor: 'bg-red-500/20 text-red-400 border-red-500/30' }
  }
  if (HESITANTE_KEYWORDS.some(k => textoUser.includes(k))) {
    return { nivel: 'hesitante', label: '🟡 Hesitante', cor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' }
  }
  return { nivel: 'interessado', label: '🟢 Interessado', cor: 'bg-green-500/20 text-green-400 border-green-500/30' }
}

function slaInfo(ts: string, etapa: number) {
  const minutos = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  const limite = SLA_ETAPA[etapa] || 60
  const pct = Math.min(minutos / limite, 1)
  const estourado = minutos >= limite
  return { minutos, limite, pct, estourado }
}

function formatMinutos(min: number) {
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h${m}min` : `${h}h`
}

const ETAPA_TITLES: Record<number, string> = {
  1: 'ETAPA 1 — Apresentação',
  2: 'ETAPA 2 — Conexão',
  3: 'ETAPA 3 — D.I. (Combinado)',
  4: 'ETAPA 4 — Speech do Produto',
  5: 'ETAPA 5 — Fechamento',
  6: 'ETAPA 6 — Referidos',
  7: 'ETAPA 7 — Validação',
}

function estaTravado(ts: string, temperatura: string) {
  const minutos = (Date.now() - new Date(ts).getTime()) / 60000
  if (temperatura === 'quente') return minutos > 15
  if (temperatura === 'morno') return minutos > 60
  return false
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
  const [toggling, setToggling] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroTemp, setFiltroTemp] = useState<string>('')
  const [filtroEtapa, setFiltroEtapa] = useState<number>(0)
  const selectedRef = useRef<LeadAgente | null>(null)
  selectedRef.current = selected

  const fetchLeads = useCallback(async () => {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('leads')
      .select('id, telefone, nome, etapa, etapa_agente, temperatura, dor_principal, historico, updated_at, atendimento_humano')
      .not('historico', 'eq', '[]')
      .not('historico', 'is', null)
      .order('updated_at', { ascending: false })

    if (data) {
      // garante campo novo mesmo em rows antigas
      (data as LeadAgente[]).forEach(l => { if (l.atendimento_humano === undefined) l.atendimento_humano = false })
      // Deduplica por telefone mantendo o mais recente
      const vistos = new Map<string, LeadAgente>()
      for (const lead of data as LeadAgente[]) {
        if (!vistos.has(lead.telefone) || lead.updated_at > vistos.get(lead.telefone)!.updated_at) {
          vistos.set(lead.telefone, lead)
        }
      }
      const unicos = Array.from(vistos.values()).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      setLeads(unicos)
      if (selectedRef.current) {
        const updated = unicos.find(l => l.id === selectedRef.current!.id)
        if (updated) setSelected(updated)
      }
      setLastUpdate(new Date())
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchLeads()
    // Fallback de segurança — garante atualização mesmo se o realtime cair
    const interval = setInterval(fetchLeads, 30000)

    const supabase = getSupabase()
    const channel = supabase
      .channel('agente-leads')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, () => fetchLeads())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, () => fetchLeads())
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [fetchLeads])

  const enviarMensagem = async () => {
    if (!selected || !msgText.trim() || sending) return
    setSending(true)
    try {
      await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: selected.telefone, message: msgText.trim(), leadId: selected.id }),
      })
      setMsgText('')
      await fetchLeads()
    } finally {
      setSending(false)
    }
  }

  const toggleHumano = async () => {
    if (!selected || toggling) return
    setToggling(true)
    const supabase = getSupabase()
    const novoValor = !selected.atendimento_humano
    await supabase
      .from('leads')
      .update({ atendimento_humano: novoValor })
      .eq('id', selected.id)

    // Ao assumir, avisa o lead que o time comercial entrou
    if (novoValor) {
      await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selected.telefone,
          message: `Olá! 😊 Aqui é o time comercial do Dr. Vinícius Cechella. Estou assumindo seu atendimento agora para te ajudar melhor. Como posso te ajudar?`,
          leadId: selected.id,
        }),
      })
    }

    await fetchLeads()
    setToggling(false)
  }

  const leadsFiltrados = leads.filter(l => {
    if (busca) {
      const q = busca.toLowerCase()
      const nome = (l.nome || l.telefone).toLowerCase()
      if (!nome.includes(q) && !l.telefone.includes(q)) return false
    }
    if (filtroTemp && l.temperatura !== filtroTemp) return false
    if (filtroEtapa && (l.etapa_agente || 1) !== filtroEtapa) return false
    return true
  })

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
                {leadsFiltrados.length}/{leads.length} leads
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#71717A]">
                  {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>

            {/* Busca e filtros */}
            <div className="px-3 py-2 border-b border-[#1C1C1E] space-y-2">
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar por nome ou telefone..."
                className="w-full bg-[#1C1C1E] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#555] outline-none focus:border-[#7B3FE4] transition-colors"
              />
              <div className="flex gap-1.5">
                <select
                  value={filtroTemp}
                  onChange={e => setFiltroTemp(e.target.value)}
                  className="flex-1 bg-[#1C1C1E] border border-[#2a2a2a] rounded-lg px-2 py-1 text-[10px] text-white outline-none"
                >
                  <option value="">Temperatura</option>
                  <option value="quente">🔥 Quente</option>
                  <option value="morno">🟡 Morno</option>
                  <option value="frio">❄️ Frio</option>
                </select>
                <select
                  value={filtroEtapa}
                  onChange={e => setFiltroEtapa(Number(e.target.value))}
                  className="flex-1 bg-[#1C1C1E] border border-[#2a2a2a] rounded-lg px-2 py-1 text-[10px] text-white outline-none"
                >
                  <option value={0}>Etapa</option>
                  {ETAPAS.map(e => <option key={e.n} value={e.n}>{e.n}. {e.label}</option>)}
                </select>
                {(busca || filtroTemp || filtroEtapa > 0) && (
                  <button
                    onClick={() => { setBusca(''); setFiltroTemp(''); setFiltroEtapa(0) }}
                    className="px-2 py-1 text-[10px] text-[#71717A] hover:text-white bg-[#1C1C1E] border border-[#2a2a2a] rounded-lg"
                  >
                    ✕
                  </button>
                )}
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
                leadsFiltrados.map(lead => {
                  const etapa = lead.etapa_agente || 1
                  const STATUS_WORDS = ['pendente', 'aguardando', 'novo', 'lead', 'unknown', 'undefined', 'null']
                  const nomeRaw = lead.nome?.trim().toLowerCase() || ''
                  const nome = (lead.nome && !STATUS_WORDS.includes(nomeRaw)) ? lead.nome : lead.telefone
                  const isActive = selected?.id === lead.id
                  const historicoValido = Array.isArray(lead.historico) ? lead.historico.filter(m => m && m.content) : []
                  const lastMsg = historicoValido[historicoValido.length - 1]
                  const risco = scoreRisco(historicoValido)

                  return (
                    <button
                      key={lead.id}
                      onClick={() => setSelected(lead)}
                      className={`w-full text-left px-4 py-3.5 border-b border-[#1A1A1C] transition-all ${
                        isActive ? 'bg-[#1A1A2E] border-l-2 border-l-[#7B3FE4]' : 'hover:bg-[#141416]'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium text-white truncate max-w-[150px] flex items-center gap-1.5">
                          {estaTravado(lead.updated_at, lead.temperatura) && (
                            <span title="Lead sem resposta há muito tempo" className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                          )}
                          {nome}
                        </span>
                        <TempBadge t={lead.temperatura} />
                      </div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${risco.cor}`}>
                          {risco.label}
                        </span>
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
                      {/* SLA bar */}
                      {(() => {
                        const { minutos, limite, pct, estourado } = slaInfo(lead.updated_at, etapa)
                        return (
                          <div className="mt-1.5">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-[9px] font-medium ${estourado ? 'text-red-400' : 'text-[#555]'}`}>
                                SLA {estourado ? '⚠ ESTOURADO' : `${formatMinutos(minutos)} / ${formatMinutos(limite)}`}
                              </span>
                            </div>
                            <div className="w-full h-0.5 rounded-full bg-[#2a2a2a]">
                              <div
                                className={`h-0.5 rounded-full transition-all ${
                                  pct >= 1 ? 'bg-red-500' : pct >= 0.75 ? 'bg-orange-400' : 'bg-green-500'
                                }`}
                                style={{ width: `${pct * 100}%` }}
                              />
                            </div>
                          </div>
                        )
                      })()}
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
                      {(() => { const s = selected.nome?.trim().toLowerCase() || ''; const bad = ['pendente','aguardando','novo','lead','unknown','undefined','null']; return (selected.nome && !bad.includes(s)) ? selected.nome : selected.telefone })()}
                    </h2>
                    <p className="text-xs text-[#71717A] mt-0.5 flex items-center gap-2">
                      {selected.telefone}
                      {selected.dor_principal && ` · Dor: ${selected.dor_principal}`}
                      {(() => { const r = scoreRisco(historico.filter(m => m && m.content)); return <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium ${r.cor}`}>{r.label}</span> })()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.atendimento_humano && (
                      <span className="text-[10px] px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 font-medium animate-pulse">
                        👨‍⚕️ Atendimento Humano - Time Comercial Dr Vinícius Cechella
                      </span>
                    )}
                    <button
                      onClick={toggleHumano}
                      disabled={toggling}
                      title={selected.atendimento_humano ? 'Devolver para Ana' : 'Assumir conversa'}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selected.atendimento_humano
                          ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/30'
                          : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30'
                      } disabled:opacity-50`}
                    >
                      {toggling ? '...' : selected.atendimento_humano ? '🤖 Devolver à Ana' : '👤 Assumir conversa'}
                    </button>
                    <button
                      onClick={fetchLeads}
                      className="p-2 text-[#71717A] hover:text-white hover:bg-[#1C1C1E] rounded-lg transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
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
              {/* Campo de envio — só aparece quando humano assumiu */}
              {selected.atendimento_humano && (
                <div className="px-4 py-3 border-t border-[#1C1C1E] bg-[#0D0D0F] flex gap-2">
                  <input
                    type="text"
                    value={msgText}
                    onChange={e => setMsgText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 bg-[#1C1C1E] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] outline-none focus:border-[#7B3FE4] transition-colors"
                  />
                  <button
                    onClick={enviarMensagem}
                    disabled={sending || !msgText.trim()}
                    className="px-4 py-2.5 bg-[#7B3FE4] hover:bg-[#6B2FD4] disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-all"
                  >
                    {sending ? '...' : 'Enviar'}
                  </button>
                </div>
              )}
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
