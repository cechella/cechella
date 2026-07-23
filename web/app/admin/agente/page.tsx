'use client'

import { useState, useEffect, useCallback, useRef, Component, ReactNode } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import { RefreshCw, Bot, User, MessageSquare } from 'lucide-react'

/* ─── Error Boundary ─────────────────────────────────────────────────────── */
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

/* ─── Supabase singleton ─────────────────────────────────────────────────── */
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

/* ─── Interfaces ─────────────────────────────────────────────────────────── */
interface MsgHistorico {
  role: 'user' | 'assistant'
  content: string
  ts?: string
  type?: string
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

interface FinanceiroResumo {
  totalRecebido?: number
  taxaConversao?: number
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const ETAPAS = [
  { n: 1, label: 'Apresentação' },
  { n: 2, label: 'Conexão' },
  { n: 3, label: 'D.I.' },
  { n: 4, label: 'Speech' },
  { n: 5, label: 'Fechamento' },
  { n: 6, label: 'Referidos' },
  { n: 7, label: 'Validação' },
]

const SLA_ETAPA: Record<number, number> = {
  1: 30,
  2: 60,
  3: 60,
  4: 30,
  5: 20,
  6: 120,
  7: 240,
}

const RISCO_KEYWORDS = ['não quero', 'nao quero', 'me tira', 'cancela', 'cancelar', 'desistir', 'desisti', 'golpe', 'fraude', 'enganando', 'mentira', 'reclamar', 'procon', 'reclame aqui', 'processo', 'advogado', 'caro demais', 'muito caro', 'não tenho dinheiro', 'sem dinheiro', 'não posso', 'nao posso', 'para de me', 'me deixa', 'não me mande', 'nao me mande', 'bloquear', 'bloqueia']
const HESITANTE_KEYWORDS = ['não sei', 'nao sei', 'talvez', 'vou pensar', 'deixa eu pensar', 'depois', 'semana que vem', 'mês que vem', 'não tenho certeza', 'nao tenho certeza', 'meu marido', 'minha família', 'preciso falar', 'muito caro', 'caro', 'parcelado', 'desconto', 'funciona mesmo', 'tem resultado', 'é seguro', 'e seguro']

const ETAPA_TITLES: Record<number, string> = {
  1: 'ETAPA 1 — Apresentação',
  2: 'ETAPA 2 — Conexão',
  3: 'ETAPA 3 — D.I. (Combinado)',
  4: 'ETAPA 4 — Speech do Produto',
  5: 'ETAPA 5 — Fechamento',
  6: 'ETAPA 6 — Referidos',
  7: 'ETAPA 7 — Validação',
}

const STATUS_WORDS = ['pendente', 'aguardando', 'novo', 'lead', 'unknown', 'undefined', 'null']

/* ─── Utility functions ──────────────────────────────────────────────────── */
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

function displayName(lead: LeadAgente) {
  const raw = lead.nome?.trim().toLowerCase() || ''
  return (lead.nome && !STATUS_WORDS.includes(raw)) ? lead.nome : lead.telefone
}

function urgencyScore(lead: LeadAgente): number {
  const sla = slaInfo(lead.updated_at, lead.etapa_agente || 1)
  const slaScore = Math.round(sla.pct * 60)
  const tempScore = lead.temperatura === 'quente' ? 30 : lead.temperatura === 'morno' ? 15 : 0
  const etapaScore = (lead.etapa_agente || 1) >= 5 ? 10 : 0
  return Math.min(slaScore + tempScore + etapaScore, 100)
}

function urgencyColor(score: number) {
  if (score > 75) return '#FF3B5C'
  if (score >= 40) return '#F5A623'
  return '#00D084'
}

function conversionScore(lead: LeadAgente): number {
  const textoUser = lead.historico
    .filter(m => m.role === 'user')
    .map(m => m.content?.toLowerCase() || '')
    .join(' ')
  const base = (lead.etapa_agente || 1) * 12
  const bonus = RISCO_KEYWORDS.some(k => textoUser.includes(k)) ? 0 : 8
  const hesitantePenalty = HESITANTE_KEYWORDS.some(k => textoUser.includes(k)) ? -15 : 0
  const riscoPenalty = RISCO_KEYWORDS.some(k => textoUser.includes(k)) ? -30 : 0
  return Math.max(0, Math.min(99, base + bonus + hesitantePenalty + riscoPenalty))
}

const POSITIVE_WORDS = ['sim', 'quero', 'gostei', 'ótimo', 'perfeito', 'adorei', 'incrível', 'obrigada', 'maravilha', 'excelente']

function sentimentBars(historico: MsgHistorico[]) {
  const userMsgs = historico.filter(m => m.role === 'user').slice(-7)
  return userMsgs.map(m => {
    const txt = m.content?.toLowerCase() || ''
    if (POSITIVE_WORDS.some(k => txt.includes(k))) return { type: 'positive', height: 80 }
    if (RISCO_KEYWORDS.some(k => txt.includes(k))) return { type: 'negative', height: 25 }
    return { type: 'neutral', height: 50 }
  })
}

function detectSignals(historico: MsgHistorico[]) {
  const txt = historico.filter(m => m.role === 'user').map(m => m.content?.toLowerCase() || '').join(' ')
  const signals: { label: string; color: string }[] = []
  if (txt.includes('cansaço') || txt.includes('cansada')) signals.push({ label: 'Cansaço crônico', color: '#FF3B5C' })
  if (txt.includes('emagrecer') || txt.includes('peso')) signals.push({ label: 'Dif. emagrecer', color: '#FF3B5C' })
  if (txt.includes('preço') || txt.includes('quanto') || txt.includes('custa') || txt.includes('valor')) signals.push({ label: 'Perguntou preço', color: '#00D084' })
  if (txt.includes('ansiedade') || txt.includes('ansioso')) signals.push({ label: 'Ansiedade', color: '#FF3B5C' })
  if (txt.includes('hormônio') || txt.includes('hormonal')) signals.push({ label: 'Interesse hormonal', color: '#7B3FE4' })
  return signals
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */
interface ToastItem { id: number; nome: string }

function ToastNotification({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onDismiss(t.id)}
          style={{
            background: '#1C1C1E',
            border: '1px solid #2a2a2a',
            borderLeft: '3px solid #7B3FE4',
            borderRadius: 10,
            padding: '10px 16px',
            color: '#fff',
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            animation: 'none',
          }}
        >
          🔔 Nova mensagem — <strong>{t.nome}</strong>
        </div>
      ))}
    </div>
  )
}

/* ─── Command Palette ────────────────────────────────────────────────────── */
interface CmdPaletteProps {
  leads: LeadAgente[]
  onClose: () => void
  onSelectLead: (lead: LeadAgente) => void
  onToggleHumano: () => void
  selectedLead: LeadAgente | null
}

function CommandPalette({ leads, onClose, onSelectLead, onToggleHumano, selectedLead }: CmdPaletteProps) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const actions = [
    { label: '👤 Assumir conversa', hint: '⌘H', action: () => { onToggleHumano(); onClose() } },
    { label: '🔁 Devolver à Ana', hint: '⌘B', action: () => { onToggleHumano(); onClose() } },
    { label: '💰 Abrir financeiro', hint: '', action: () => { window.open('/admin/financeiro', '_blank'); onClose() } },
    { label: '📋 Ver no CRM', hint: '⌘I', action: () => { window.open('/admin/crm', '_blank'); onClose() } },
  ]

  const matchedLeads = leads.filter(l => {
    const q = query.toLowerCase()
    return !q || displayName(l).toLowerCase().includes(q) || l.telefone.includes(q)
  }).slice(0, 5)

  const allItems: { label: string; hint?: string; action: () => void }[] = [
    ...matchedLeads.map(l => ({
      label: `💬 ${displayName(l)}`,
      hint: l.telefone,
      action: () => { onSelectLead(l); onClose() }
    })),
    ...actions.filter(a => !query || a.label.toLowerCase().includes(query.toLowerCase())),
  ]

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, allItems.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && allItems[cursor]) { allItems[cursor].action() }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 120 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#111113', border: '1px solid #2a2a2a', borderRadius: 14, width: 520, maxHeight: 400, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.8)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #1C1C1E', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#555', fontSize: 14 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setCursor(0) }}
            onKeyDown={handleKey}
            placeholder="Buscar lead ou ação..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14 }}
          />
          <span style={{ color: '#444', fontSize: 11 }}>ESC</span>
        </div>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {allItems.map((item, i) => (
            <button
              key={i}
              onClick={item.action}
              style={{
                width: '100%', textAlign: 'left', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: i === cursor ? '#1C1C1E' : 'transparent', border: 'none', cursor: 'pointer', color: i === cursor ? '#fff' : '#A1A1AA',
                fontSize: 13, transition: 'background 0.1s',
              }}
              onMouseEnter={() => setCursor(i)}
            >
              <span>{item.label}</span>
              {item.hint && <span style={{ fontSize: 11, color: '#555', fontFamily: 'monospace' }}>{item.hint}</span>}
            </button>
          ))}
          {allItems.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: '#444', fontSize: 13 }}>Nenhum resultado</div>
          )}
        </div>
        <div style={{ padding: '8px 16px', borderTop: '1px solid #1C1C1E', display: 'flex', gap: 16, fontSize: 11, color: '#444' }}>
          <span>↑↓ navegar</span>
          <span>↵ executar</span>
          <span>ESC fechar</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function AgenteAdminPage() {
  const [leads, setLeads] = useState<LeadAgente[]>([])
  const [selected, setSelected] = useState<LeadAgente | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [toggling, setToggling] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  const [busca, setBusca] = useState('')
  const [sortTab, setSortTab] = useState<'urgencia' | 'etapa' | 'recente'>('urgencia')
  const [cmdOpen, setCmdOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [financeiro, setFinanceiro] = useState<FinanceiroResumo>({})
  const [autoSelected, setAutoSelected] = useState(false)
  const [chatSource, setChatSource] = useState<'whatsapp' | 'ana'>('ana')
  const [zapiMsgs, setZapiMsgs] = useState<MsgHistorico[]>([])
  const [zapiLoading, setZapiLoading] = useState(false)
  const [zapiError, setZapiError] = useState<string | null>(null)
  const [pixInfo, setPixInfo] = useState<{ pix_code?: string; checkout_url?: string; valor?: number; status: string; metodo: string } | null>(null)

  const selectedRef = useRef<LeadAgente | null>(null)
  selectedRef.current = selected
  const leadsRef = useRef<LeadAgente[]>([])
  leadsRef.current = leads
  const chatEndRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const toastId = useRef(0)

  const zapiMsgsRef = useRef<MsgHistorico[]>([])
  const fetchZapiHistory = useCallback(async (phone: string, silent = false) => {
    if (!silent) { setZapiLoading(true); setZapiError(null) }
    try {
      const resp = await fetch(`/api/admin/chat-history?phone=${encodeURIComponent(phone)}&count=200`)
      const data = await resp.json()
      if (data.ok && Array.isArray(data.messages)) {
        const prev = zapiMsgsRef.current
        const hasNew = data.messages.length !== prev.length ||
          (data.messages.length > 0 && prev.length > 0 &&
            data.messages[data.messages.length - 1].ts !== prev[prev.length - 1].ts)
        if (hasNew) {
          zapiMsgsRef.current = data.messages
          setZapiMsgs(data.messages)
          const umDiaAtras = Date.now() - 24 * 60 * 60 * 1000
          const temMensagemRecente = data.messages.some((m: MsgHistorico) => m.ts && new Date(m.ts).getTime() > umDiaAtras)
          if (temMensagemRecente) setChatSource('whatsapp')
        }
      } else if (!silent) {
        setZapiError(data.error || 'Erro ao carregar histórico')
        setZapiMsgs([])
      }
    } catch {
      if (!silent) setZapiError('Falha de conexão')
    } finally {
      if (!silent) setZapiLoading(false)
    }
  }, [])

  /* fetch financeiro */
  useEffect(() => {
    fetch('/api/admin/financeiro?tipo=resumo')
      .then(r => r.ok ? r.json() : {})
      .then(d => setFinanceiro(d))
      .catch(() => {})
  }, [])

  const addToast = useCallback((nome: string) => {
    const id = ++toastId.current
    setToasts(prev => [...prev, { id, nome }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const fetchLeads = useCallback(async () => {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('leads')
      .select('id, telefone, nome, etapa, etapa_agente, temperatura, dor_principal, historico, updated_at, atendimento_humano')
      .not('historico', 'eq', '[]')
      .not('historico', 'is', null)
      .order('updated_at', { ascending: false })

    if (data) {
      ;(data as LeadAgente[]).forEach(l => { if (l.atendimento_humano === undefined) l.atendimento_humano = false })
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
      return unicos
    }
    setLoading(false)
    return []
  }, [])

  useEffect(() => {
    fetchLeads().then(unicos => {
      setLoading(false)
    })
    const interval = setInterval(fetchLeads, 30000)
    const supabase = getSupabase()
    const channel = supabase
      .channel('agente-leads')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload: { new: Record<string, unknown> }) => {
        fetchLeads()
        const updated = payload.new as unknown as LeadAgente
        if (updated && selectedRef.current?.id !== updated.id) {
          const nome = (updated.nome && !STATUS_WORDS.includes(updated.nome.trim().toLowerCase())) ? updated.nome : updated.telefone
          addToast(nome)
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload: { new: Record<string, unknown> }) => {
        fetchLeads()
        const inserted = payload.new as unknown as LeadAgente
        if (inserted) {
          const nome = (inserted.nome && !STATUS_WORDS.includes(inserted.nome.trim().toLowerCase())) ? inserted.nome : inserted.telefone
          addToast(nome)
        }
      })
      .subscribe()
    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [fetchLeads, addToast])

  /* auto-select highest urgency on first load */
  useEffect(() => {
    if (!autoSelected && leads.length > 0 && !selected) {
      const top = [...leads].sort((a, b) => urgencyScore(b) - urgencyScore(a))[0]
      setSelected(top)
      setAutoSelected(true)
    }
  }, [leads, selected, autoSelected])

  /* fetch Z-API full history when lead changes + realtime subscription */
  useEffect(() => {
    if (!selected?.telefone) {
      setZapiMsgs([])
      setZapiError(null)
      return
    }
    const phone = selected.telefone
    zapiMsgsRef.current = []
    fetchZapiHistory(phone, false)
    const supabase = getSupabase()
    const normalized = phone.replace(/\D/g, '')
    const alt = normalized.length === 13 && normalized.startsWith('55')
      ? normalized.slice(0, 4) + normalized.slice(5)
      : normalized.length === 12 && normalized.startsWith('55')
        ? normalized.slice(0, 4) + '9' + normalized.slice(4)
        : null
    const channel = supabase
      .channel(`msgs-${phone}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_whatsapp', filter: `phone=eq.${normalized}` }, () => fetchZapiHistory(phone))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens_whatsapp', filter: alt ? `phone=eq.${alt}` : `phone=eq.${normalized}` }, () => fetchZapiHistory(phone))
      .subscribe()
    const poll = setInterval(() => fetchZapiHistory(phone, true), 20000)
    return () => { supabase.removeChannel(channel); clearInterval(poll) }
  }, [selected?.id, fetchZapiHistory])

  /* fetch PIX info when lead changes */
  useEffect(() => {
    if (!selected?.telefone) { setPixInfo(null); return }
    fetch(`/api/admin/pagamento-pix?phone=${encodeURIComponent(selected.telefone)}`)
      .then(r => r.json())
      .then(d => setPixInfo(d.ok ? d.pagamento : null))
      .catch(() => setPixInfo(null))
  }, [selected?.id])

  /* auto-scroll chat */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected?.historico?.length, zapiMsgs.length])

  /* keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(v => !v) }
      if ((e.metaKey || e.ctrlKey) && e.key === 'h') { e.preventDefault(); toggleHumano() }
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') { e.preventDefault(); fetchLeads() }
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') { e.preventDefault(); if (selectedRef.current?.atendimento_humano) toggleHumano() }
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') { e.preventDefault(); window.open('/admin/crm', '_blank') }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') { e.preventDefault(); toggleHumano() }
      if (e.key === 'Escape') setCmdOpen(false)
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!selectedRef.current || toggling) return
    setToggling(true)
    const supabase = getSupabase()
    const lead = selectedRef.current
    const novoValor = !lead.atendimento_humano
    await supabase.from('leads').update({ atendimento_humano: novoValor }).eq('id', lead.id)
    if (novoValor) {
      await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: lead.telefone,
          message: `Olá! 😊 Aqui é o time comercial do Dr. Vinícius Cechella. Estou assumindo seu atendimento agora para te ajudar melhor. Como posso te ajudar?`,
          leadId: lead.id,
        }),
      })
    }
    await fetchLeads()
    setToggling(false)
  }

  /* ─── Derived metrics ─── */
  const slaEstouradoCount = leads.filter(l => slaInfo(l.updated_at, l.etapa_agente || 1).estourado).length
  const semRespostaCount = leads.filter(l => {
    const diff = (Date.now() - new Date(l.updated_at).getTime()) / 60000
    return diff > 60
  }).length

  /* ─── Lead list with sort ─── */
  const leadsFiltrados = (() => {
    let arr = leads.filter(l => {
      if (!busca) return true
      const q = busca.toLowerCase()
      return displayName(l).toLowerCase().includes(q) || l.telefone.includes(q)
    })
    if (sortTab === 'urgencia') arr = [...arr].sort((a, b) => urgencyScore(b) - urgencyScore(a))
    else if (sortTab === 'etapa') arr = [...arr].sort((a, b) => (b.etapa_agente || 1) - (a.etapa_agente || 1))
    // recente: already sorted by updated_at from DB
    return arr
  })()

  const etapaAtual = selected?.etapa_agente || 1
  const historico = selected?.historico || []

  /* ─── Intelligence panel computed values ─── */
  const convScore = selected ? conversionScore(selected) : 0
  const sentBars = selected ? sentimentBars(historico) : []
  const signals = selected ? detectSignals(historico) : []

  const sessaoMensagens = historico.length
  const sessaoFirstTs = historico[0]?.ts
  const sessaoDuracao = sessaoFirstTs
    ? Math.floor((Date.now() - new Date(sessaoFirstTs).getTime()) / 60000)
    : selected ? Math.floor((Date.now() - new Date(selected.updated_at).getTime()) / 60000) : 0
  const sessaoSemResp = selected ? Math.floor((Date.now() - new Date(selected.updated_at).getTime()) / 60000) : 0

  const activityLog = selected ? (() => {
    const logs: { icon: string; label: string; color: string; time: string }[] = []
    const etapa = selected.etapa_agente || 1
    logs.push({ icon: '→', label: `Avançou para Etapa ${etapa} — ${ETAPAS.find(e => e.n === etapa)?.label || ''}`, color: '#7B3FE4', time: timeAgo(selected.updated_at) })
    if (etapa >= 5) logs.push({ icon: '🔗', label: 'Link de pagamento enviado', color: '#F5A623', time: timeAgo(selected.updated_at) })
    if (etapa > 2) logs.push({ icon: '→', label: `Avançou para Etapa ${etapa - 1} — ${ETAPAS.find(e => e.n === etapa - 1)?.label || ''}`, color: '#7B3FE4', time: '' })
    if (etapa > 3) logs.push({ icon: '→', label: `Avançou para Etapa ${etapa - 2} — ${ETAPAS.find(e => e.n === etapa - 2)?.label || ''}`, color: '#7B3FE4', time: '' })
    return logs.slice(0, 4)
  })() : []

  /* ─── Ring chart SVG ─── */
  const ringSize = 72
  const strokeW = 7
  const r = (ringSize - strokeW) / 2
  const circ = 2 * Math.PI * r
  const ringOffset = circ - (convScore / 100) * circ

  return (
    <ErrorBoundary>
      {cmdOpen && (
        <CommandPalette
          leads={leads}
          onClose={() => setCmdOpen(false)}
          onSelectLead={setSelected}
          onToggleHumano={toggleHumano}
          selectedLead={selected}
        />
      )}

      <ToastNotification toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
        <Sidebar role="admin" />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar title="Agente WhatsApp — Monitor em Tempo Real" />

          {/* ─── Metrics bar ─── */}
          <div style={{ background: '#0D0D0F', borderBottom: '1px solid #1C1C1E', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, overflowX: 'auto' }}>
            {[
              {
                icon: '🟢', label: 'Conversas ativas', value: leads.length, color: '#00D084'
              },
              {
                icon: '⚠️', label: 'SLA estourado', value: slaEstouradoCount, color: slaEstouradoCount > 0 ? '#FF3B5C' : '#71717A'
              },
              {
                icon: '💰', label: 'Receita hoje', value: financeiro.totalRecebido != null ? `R$ ${financeiro.totalRecebido.toLocaleString('pt-BR')}` : '—', color: '#00D084'
              },
              {
                icon: '📈', label: 'Taxa conversão', value: financeiro.taxaConversao != null ? `${financeiro.taxaConversao}%` : '—', color: '#7B3FE4'
              },
              {
                icon: '⏱', label: 'Sem resp. >1h', value: semRespostaCount, color: semRespostaCount > 0 ? '#F5A623' : '#71717A'
              },
            ].map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: '#111113', borderRadius: 8, border: '1px solid #1C1C1E', whiteSpace: 'nowrap', flexShrink: 0 }}>
                <span style={{ fontSize: 13 }}>{m.icon}</span>
                <div>
                  <div style={{ fontSize: 10, color: '#71717A', lineHeight: 1.2 }}>{m.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: m.color, lineHeight: 1.2 }}>{m.value}</div>
                </div>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span style={{ fontSize: 10, color: '#444' }}>{lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <button
                onClick={() => fetchLeads()}
                title="Atualizar (⌘R)"
                style={{ padding: '4px 8px', background: '#1C1C1E', border: '1px solid #2a2a2a', borderRadius: 6, cursor: 'pointer', color: '#71717A', fontSize: 11 }}
              >
                ↺
              </button>
              <button
                onClick={() => setCmdOpen(true)}
                title="Comando (⌘K)"
                style={{ padding: '4px 10px', background: '#1C1C1E', border: '1px solid #2a2a2a', borderRadius: 6, cursor: 'pointer', color: '#71717A', fontSize: 11 }}
              >
                ⌘K
              </button>
            </div>
          </div>

          {/* ─── 3-col layout ─── */}
          <div className="flex flex-1 overflow-hidden">

            {/* ══ LEFT: Lead priority queue (260px) ══ */}
            <div style={{ width: 260, borderRight: '1px solid #1C1C1E', display: 'flex', flexDirection: 'column', background: '#0D0D0F', flexShrink: 0 }}>
              {/* Sort tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #1C1C1E' }}>
                {(['urgencia', 'etapa', 'recente'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSortTab(tab)}
                    style={{
                      flex: 1, padding: '8px 4px', fontSize: 10, fontWeight: 600,
                      textTransform: 'capitalize', border: 'none', cursor: 'pointer',
                      background: sortTab === tab ? '#1C1C1E' : 'transparent',
                      color: sortTab === tab ? '#fff' : '#555',
                      borderBottom: sortTab === tab ? '2px solid #7B3FE4' : '2px solid transparent',
                      transition: 'all 0.15s',
                    }}
                  >
                    {tab === 'urgencia' ? 'Urgência' : tab === 'etapa' ? 'Etapa' : 'Recente'}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #1C1C1E' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Buscar... (/)"
                    style={{
                      width: '100%', background: '#1C1C1E', border: '1px solid #2a2a2a', borderRadius: 7,
                      padding: '6px 10px 6px 10px', fontSize: 11, color: '#fff', outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 9, color: '#444', pointerEvents: 'none' }}>/</span>
                </div>
              </div>

              <div style={{ fontSize: 9, color: '#444', padding: '4px 12px', borderBottom: '1px solid #1C1C1E' }}>
                {leadsFiltrados.length}/{leads.length} leads
              </div>

              {/* Lead list */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 48 }}>
                    <div className="w-5 h-5 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : leadsFiltrados.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 32, color: '#444', fontSize: 12 }}>
                    <MessageSquare style={{ width: 28, height: 28, margin: '0 auto 8px', opacity: 0.3 }} />
                    Nenhum lead
                  </div>
                ) : leadsFiltrados.map(lead => {
                  const etapa = lead.etapa_agente || 1
                  const nome = displayName(lead)
                  const isActive = selected?.id === lead.id
                  const historicoValido = Array.isArray(lead.historico) ? lead.historico.filter(m => m && m.content) : []
                  const lastMsg = historicoValido[historicoValido.length - 1]
                  const sla = slaInfo(lead.updated_at, etapa)
                  const score = urgencyScore(lead)
                  const scoreCol = urgencyColor(score)
                  const isNew = (Date.now() - new Date(lead.updated_at).getTime()) < 120000

                  return (
                    <button
                      key={lead.id}
                      onClick={() => setSelected(lead)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '10px 12px',
                        borderBottom: '1px solid #1A1A1C',
                        borderLeft: isActive ? '2px solid #7B3FE4' : '2px solid transparent',
                        background: isActive ? '#1A1A2E' : 'transparent',
                        cursor: 'pointer', transition: 'background 0.1s',
                      }}
                    >
                      {/* Row 1: name + score badge */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
                          {isNew && <div className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#7B3FE4', flexShrink: 0 }} />}
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 130 }}>{nome}</span>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, color: scoreCol, background: scoreCol + '20', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{score}</span>
                      </div>

                      {/* Row 2: etapa badge + time */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 9, background: '#1C1C1E', color: '#7B3FE4', borderRadius: 4, padding: '1px 5px', border: '1px solid #2a2a2a' }}>E{etapa}</span>
                        <span style={{ fontSize: 9, color: sla.estourado ? '#FF3B5C' : '#555' }}>{timeAgo(lead.updated_at)}</span>
                        {sla.estourado && <span style={{ fontSize: 9, color: '#FF3B5C' }}>⚠</span>}
                      </div>

                      {/* Last message */}
                      <p style={{ fontSize: 10, color: '#71717A', marginBottom: 5, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {lastMsg?.content?.substring(0, 45) || 'Sem mensagens'}
                        {(lastMsg?.content?.length || 0) > 45 ? '…' : ''}
                      </p>

                      {/* Urgency bar */}
                      <div style={{ marginBottom: 4 }}>
                        <div style={{ height: 3, background: '#1C1C1E', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${score}%`, background: scoreCol, borderRadius: 2, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ══ CENTER: Chat panel ══ */}
            {selected ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Chat header */}
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #1C1C1E', background: '#0D0D0F', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>{displayName(selected)}</h2>
                        {(() => { const r = scoreRisco(historico.filter(m => m && m.content)); return <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 20, background: '#1C1C1E', color: r.nivel === 'risco' ? '#FF3B5C' : r.nivel === 'hesitante' ? '#F5A623' : '#00D084', border: '1px solid currentColor' }}>{r.label}</span> })()}
                        {slaInfo(selected.updated_at, etapaAtual).estourado && (
                          <span style={{ fontSize: 9, color: '#FF3B5C', background: '#FF3B5C20', padding: '2px 6px', borderRadius: 20 }}>⚠ SLA estourado</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#71717A', fontFamily: 'monospace' }}>{selected.telefone}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Ana status */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: selected.atendimento_humano ? '#F5A623' : '#00D084', background: '#1C1C1E', borderRadius: 8, padding: '4px 10px', border: '1px solid #2a2a2a' }}>
                        {selected.atendimento_humano ? (
                          <>👨‍⚕️ Atendimento humano</>
                        ) : (
                          <>
                            🤖 Ana ativa
                            <div className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: '#00D084' }} />
                          </>
                        )}
                      </div>
                      <button
                        onClick={toggleHumano}
                        disabled={toggling}
                        title={selected.atendimento_humano ? 'Devolver à Ana (⌘B)' : 'Assumir conversa (⌘H)'}
                        style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                          background: selected.atendimento_humano ? '#00D08415' : '#7B3FE420',
                          color: selected.atendimento_humano ? '#00D084' : '#A78BFA',
                          border: `1px solid ${selected.atendimento_humano ? '#00D08430' : '#7B3FE430'}`,
                          opacity: toggling ? 0.5 : 1,
                        }}
                      >
                        {toggling ? '...' : selected.atendimento_humano ? '🔁 Devolver à Ana ⌘B' : '👤 Assumir ⌘H'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Etapa progress */}
                <div style={{ padding: '10px 20px', borderBottom: '1px solid #1A1A1C', background: '#0A0A0B', flexShrink: 0, overflowX: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, minWidth: 'max-content' }}>
                    {ETAPAS.map((e, i) => {
                      const isDone = e.n < etapaAtual
                      const isAct = e.n === etapaAtual
                      return (
                        <div key={e.n} style={{ display: 'flex', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, border: '2px solid',
                              background: isDone ? '#14532d50' : isAct ? '#7B3FE430' : '#1C1C1E',
                              borderColor: isDone ? '#22c55e' : isAct ? '#7B3FE4' : '#333',
                              color: isDone ? '#22c55e' : isAct ? '#fff' : '#555',
                              boxShadow: isAct ? '0 0 12px rgba(123,63,228,0.4)' : 'none',
                            }}>
                              {isDone ? '✓' : e.n}
                            </div>
                            <span style={{ fontSize: 8, marginTop: 4, textAlign: 'center', width: 44, color: isAct ? '#A78BFA' : isDone ? '#22c55e' : '#444', lineHeight: 1.2 }}>{e.label}</span>
                          </div>
                          {i < 6 && <div style={{ width: 28, height: 2, marginTop: 13, marginLeft: 2, marginRight: 2, background: isDone ? '#22c55e' : '#2a2a2a', borderRadius: 1 }} />}
                        </div>
                      )
                    })}
                  </div>
                  <p style={{ fontSize: 10, color: '#7B3FE4', fontWeight: 600, marginTop: 6, marginBottom: 0 }}>{ETAPA_TITLES[etapaAtual]}</p>
                </div>

                {/* Source tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid #1C1C1E', background: '#0A0A0B', flexShrink: 0 }}>
                  <button
                    onClick={() => setChatSource('whatsapp')}
                    style={{
                      padding: '8px 16px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: chatSource === 'whatsapp' ? '#1C1C1E' : 'transparent',
                      color: chatSource === 'whatsapp' ? '#fff' : '#555',
                      borderBottom: chatSource === 'whatsapp' ? '2px solid #25D366' : '2px solid transparent',
                    }}
                  >
                    📱 WhatsApp completo {zapiMsgs.length > 0 ? `(${zapiMsgs.length})` : ''}
                  </button>
                  <button
                    onClick={() => setChatSource('ana')}
                    style={{
                      padding: '8px 16px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                      background: chatSource === 'ana' ? '#1C1C1E' : 'transparent',
                      color: chatSource === 'ana' ? '#fff' : '#555',
                      borderBottom: chatSource === 'ana' ? '2px solid #7B3FE4' : '2px solid transparent',
                    }}
                  >
                    🤖 Histórico Ana ({historico.length})
                  </button>
                  {chatSource === 'whatsapp' && (
                    <button
                      onClick={() => selected && fetchZapiHistory(selected.telefone)}
                      style={{ marginLeft: 'auto', padding: '4px 12px', fontSize: 10, color: '#555', background: 'transparent', border: 'none', cursor: 'pointer' }}
                    >
                      ↺ atualizar
                    </button>
                  )}
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {chatSource === 'whatsapp' ? (
                    zapiLoading ? (
                      <div style={{ textAlign: 'center', paddingTop: 48, color: '#555', fontSize: 12 }}>
                        <div className="w-5 h-5 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" style={{ margin: '0 auto 8px' }} />
                        Carregando histórico do WhatsApp...
                      </div>
                    ) : zapiError ? (
                      <div style={{ textAlign: 'center', paddingTop: 48, color: '#555', fontSize: 12 }}>
                        <p style={{ color: '#FF3B5C', marginBottom: 8 }}>⚠ {zapiError}</p>
                        <p style={{ color: '#555', fontSize: 11 }}>Mostrando histórico da Ana abaixo</p>
                        {historico.filter(msg => msg && msg.role && msg.content).map((msg, i) => {
                          const isUser = msg.role === 'user'
                          return (
                            <div key={i} style={{ display: 'flex', gap: 8, justifyContent: isUser ? 'flex-end' : 'flex-start', textAlign: 'left', marginBottom: 12 }}>
                              <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                                <div style={{ padding: '8px 14px', borderRadius: 16, fontSize: 13, lineHeight: 1.5, background: isUser ? '#14532d40' : '#1C1C1E', color: isUser ? '#bbf7d0' : '#E4E4E7', border: `1px solid ${isUser ? '#166534' : '#2a2a2a'}`, whiteSpace: 'pre-wrap' }}>
                                  {String(msg.content || '')}
                                </div>
                                {msg.ts && <span style={{ fontSize: 9, color: '#444', marginTop: 2 }}>{formatTime(msg.ts)}</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : zapiMsgs.length === 0 ? (
                      <div style={{ textAlign: 'center', paddingTop: 48, color: '#444' }}>
                        <MessageSquare style={{ width: 28, height: 28, margin: '0 auto 8px', opacity: 0.3 }} />
                        <p style={{ fontSize: 13 }}>Nenhuma mensagem encontrada no WhatsApp</p>
                      </div>
                    ) : zapiMsgs.map((msg, i) => {
                      const isUser = msg.role === 'user'
                      return (
                        <div key={i} style={{ display: 'flex', gap: 8, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                          {!isUser && (
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#7B3FE420', border: '1px solid #7B3FE430', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                              <Bot style={{ width: 13, height: 13, color: '#A78BFA' }} />
                            </div>
                          )}
                          <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                            <div style={{
                              padding: '8px 14px', borderRadius: 16, fontSize: 13, lineHeight: 1.5,
                              background: isUser ? '#14532d40' : '#1C1C1E',
                              color: isUser ? '#bbf7d0' : '#E4E4E7',
                              border: `1px solid ${isUser ? '#166534' : '#2a2a2a'}`,
                              borderBottomRightRadius: isUser ? 4 : 16,
                              borderBottomLeftRadius: isUser ? 16 : 4,
                              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            }}>
                              {String(msg.content || '')}
                            </div>
                            {msg.ts && <span style={{ fontSize: 9, color: '#444', marginTop: 2, paddingLeft: 4 }}>{formatTime(msg.ts)}</span>}
                          </div>
                          {isUser && (
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#14532d30', border: '1px solid #16653440', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                              <User style={{ width: 13, height: 13, color: '#4ade80' }} />
                            </div>
                          )}
                        </div>
                      )
                    })
                  ) : (
                    historico.length === 0 ? (
                      <div style={{ textAlign: 'center', paddingTop: 48, color: '#444' }}>
                        <MessageSquare style={{ width: 28, height: 28, margin: '0 auto 8px', opacity: 0.3 }} />
                        <p style={{ fontSize: 13 }}>Sem mensagens</p>
                      </div>
                    ) : historico.filter(msg => msg && msg.role && msg.content).map((msg, i) => {
                      const isUser = msg.role === 'user'
                      return (
                        <div key={i} style={{ display: 'flex', gap: 8, justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
                          {!isUser && (
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#7B3FE420', border: '1px solid #7B3FE430', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                              <Bot style={{ width: 13, height: 13, color: '#A78BFA' }} />
                            </div>
                          )}
                          <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                            <div style={{
                              padding: '8px 14px', borderRadius: 16, fontSize: 13, lineHeight: 1.5,
                              background: isUser ? '#14532d40' : '#1C1C1E',
                              color: isUser ? '#bbf7d0' : '#E4E4E7',
                              border: `1px solid ${isUser ? '#166534' : '#2a2a2a'}`,
                              borderBottomRightRadius: isUser ? 4 : 16,
                              borderBottomLeftRadius: isUser ? 16 : 4,
                              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                            }}>
                              {String(msg.content || '')}
                            </div>
                            {msg.ts && <span style={{ fontSize: 9, color: '#444', marginTop: 2, paddingLeft: 4 }}>{formatTime(msg.ts)}</span>}
                          </div>
                          {isUser && (
                            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#14532d30', border: '1px solid #16653440', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                              <User style={{ width: 13, height: 13, color: '#4ade80' }} />
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Template row (when humano) */}
                {selected.atendimento_humano && (
                  <div style={{ padding: '6px 16px', borderTop: '1px solid #1C1C1E', display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0, background: '#0D0D0F' }}>
                    {['Retomar contato', 'Link pagamento', 'Oferecer desconto'].map(t => (
                      <button
                        key={t}
                        onClick={() => setMsgText(t)}
                        style={{ fontSize: 10, padding: '4px 10px', background: '#1C1C1E', border: '1px solid #2a2a2a', borderRadius: 6, color: '#A78BFA', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}

                {/* Message input or Ana control indicator */}
                {selected.atendimento_humano ? (
                  <div style={{ padding: '10px 16px', borderTop: '1px solid #1C1C1E', background: '#0D0D0F', display: 'flex', gap: 8, flexShrink: 0 }}>
                    <input
                      type="text"
                      value={msgText}
                      onChange={e => setMsgText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensagem()}
                      placeholder="Digite sua mensagem..."
                      style={{ flex: 1, background: '#1C1C1E', border: '1px solid #2a2a2a', borderRadius: 10, padding: '8px 14px', fontSize: 13, color: '#fff', outline: 'none' }}
                    />
                    <button
                      onClick={enviarMensagem}
                      disabled={sending || !msgText.trim()}
                      style={{ padding: '8px 18px', background: '#7B3FE4', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (sending || !msgText.trim()) ? 0.4 : 1 }}
                    >
                      {sending ? '...' : 'Enviar'}
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: '10px 16px', borderTop: '1px solid #1C1C1E', background: '#0D0D0F', flexShrink: 0, textAlign: 'center', fontSize: 12, color: '#555' }}>
                    🤖 Ana está no controle — clique em <strong style={{ color: '#7B3FE4' }}>Assumir</strong> para digitar
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <Bot style={{ width: 40, height: 40, margin: '0 auto 12px', color: '#2a2a2a' }} />
                  <p style={{ fontSize: 13, color: '#444' }}>Selecione um lead para ver o chat</p>
                  <p style={{ fontSize: 11, color: '#333', marginTop: 4 }}>⌘K para busca rápida</p>
                </div>
              </div>
            )}

            {/* ══ RIGHT: Intelligence panel (240px) ══ */}
            <div style={{ width: 240, borderLeft: '1px solid #1C1C1E', display: 'flex', flexDirection: 'column', background: '#0D0D0F', overflowY: 'auto', flexShrink: 0 }}>
              {selected ? (
                <>
                  {/* 1. Score de conversão */}
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #1C1C1E' }}>
                    <div style={{ fontSize: 10, color: '#71717A', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score de conversão IA</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <svg width={ringSize} height={ringSize} style={{ flexShrink: 0 }}>
                        <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke="#1C1C1E" strokeWidth={strokeW} />
                        <circle
                          cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none"
                          stroke={convScore > 66 ? '#00D084' : convScore > 33 ? '#F5A623' : '#FF3B5C'}
                          strokeWidth={strokeW}
                          strokeDasharray={circ}
                          strokeDashoffset={ringOffset}
                          strokeLinecap="round"
                          transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
                          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                        />
                        <text x={ringSize / 2} y={ringSize / 2 + 5} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">{convScore}%</text>
                      </svg>
                      <div>
                        <div style={{ fontSize: 11, color: convScore > 66 ? '#00D084' : convScore > 33 ? '#F5A623' : '#FF3B5C', fontWeight: 600, marginBottom: 2 }}>
                          {convScore > 66 ? 'Alto' : convScore > 33 ? 'Médio' : 'Baixo'}
                        </div>
                        <div style={{ fontSize: 9, color: '#555' }}>+8% última hora</div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Sentimento */}
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #1C1C1E' }}>
                    <div style={{ fontSize: 10, color: '#71717A', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sentimento da conversa</div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
                      {sentBars.length === 0 ? (
                        <div style={{ fontSize: 10, color: '#444' }}>Sem dados</div>
                      ) : sentBars.map((b, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%' }}>
                          <div style={{
                            width: '100%', borderRadius: 2,
                            height: `${b.height}%`,
                            background: b.type === 'positive' ? '#00D084' : b.type === 'negative' ? '#FF3B5C' : '#F5A623',
                            opacity: 0.8,
                            transition: 'height 0.3s',
                          }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      {[['#00D084', '+'], ['#F5A623', '~'], ['#FF3B5C', '−']].map(([c, l]) => (
                        <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#555' }}>
                          <div style={{ width: 6, height: 6, borderRadius: 1, background: c }} />{l === '+' ? 'positivo' : l === '~' ? 'neutro' : 'negativo'}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 3. Dados da sessão */}
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #1C1C1E' }}>
                    <div style={{ fontSize: 10, color: '#71717A', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dados da sessão</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[
                        { label: 'Mensagens', value: sessaoMensagens },
                        { label: 'Duração', value: formatMinutos(sessaoDuracao) },
                        { label: 'Sem resp.', value: formatMinutos(sessaoSemResp), red: sessaoSemResp > 60 },
                        { label: 'T. resposta', value: '~4min' },
                      ].map(s => (
                        <div key={s.label} style={{ background: '#111113', borderRadius: 7, padding: '7px 8px', border: '1px solid #1C1C1E' }}>
                          <div style={{ fontSize: 8, color: '#555', marginBottom: 2 }}>{s.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: s.red ? '#FF3B5C' : '#fff' }}>{s.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. Sinais detectados */}
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #1C1C1E' }}>
                    <div style={{ fontSize: 10, color: '#71717A', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sinais detectados</div>
                    {signals.length === 0 ? (
                      <div style={{ fontSize: 10, color: '#444' }}>Nenhum sinal detectado</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {signals.map((s, i) => (
                          <span key={i} style={{ fontSize: 10, fontWeight: 600, color: s.color, background: s.color + '18', borderRadius: 5, padding: '3px 7px', border: `1px solid ${s.color}30` }}>{s.label}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 5. Ações rápidas */}
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #1C1C1E' }}>
                    <div style={{ fontSize: 10, color: '#71717A', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ações rápidas</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {[
                        { icon: '📩', label: 'Enviar link pagamento', hint: '⌘P', action: toggleHumano },
                        { icon: '👤', label: 'Assumir conversa', hint: '⌘H', action: toggleHumano },
                        { icon: '🔁', label: 'Devolver à Ana', hint: '⌘B', action: () => { if (selected.atendimento_humano) toggleHumano() } },
                        { icon: '📋', label: 'Ver no CRM', hint: '⌘I', action: () => window.open('/admin/crm', '_blank') },
                      ].map(a => (
                        <button
                          key={a.label}
                          onClick={a.action}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', padding: '6px 8px', background: '#111113', border: '1px solid #1C1C1E',
                            borderRadius: 7, cursor: 'pointer', fontSize: 11, color: '#A1A1AA', textAlign: 'left',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#1C1C1E')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#111113')}
                        >
                          <span>{a.icon} {a.label}</span>
                          <span style={{ fontSize: 9, color: '#444', fontFamily: 'monospace' }}>{a.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 6. Log de atividade */}
                  {/* PIX + Cartão blocks */}
                  {pixInfo && (pixInfo.pix_code || pixInfo.checkout_url) && (
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid #1C1C1E', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {pixInfo.pix_code && (
                        <div>
                          <div style={{ fontSize: 10, color: '#71717A', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>💰 Chave PIX</div>
                          {pixInfo.valor != null && (
                            <div style={{ fontSize: 10, color: '#25D366', marginBottom: 4 }}>
                              R$ {Number(pixInfo.valor).toFixed(2)} · {pixInfo.status}
                            </div>
                          )}
                          <div style={{
                            background: '#0A0A0B', border: '1px solid #2C2C2E', borderRadius: 6,
                            padding: '6px 8px', fontSize: 9, color: '#aaa', wordBreak: 'break-all',
                            maxHeight: 56, overflowY: 'auto', lineHeight: 1.4, marginBottom: 5,
                          }}>
                            {pixInfo.pix_code}
                          </div>
                          <button
                            onClick={() => { navigator.clipboard.writeText(pixInfo!.pix_code!) }}
                            style={{ width: '100%', padding: '5px 0', fontSize: 10, background: '#25D366', color: '#000', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}
                          >
                            📋 Copiar código PIX
                          </button>
                        </div>
                      )}
                      {pixInfo.checkout_url && (
                        <div>
                          <div style={{ fontSize: 10, color: '#71717A', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>💳 Link Cartão</div>
                          <div style={{
                            background: '#0A0A0B', border: '1px solid #2C2C2E', borderRadius: 6,
                            padding: '6px 8px', fontSize: 9, color: '#aaa', wordBreak: 'break-all',
                            lineHeight: 1.4, marginBottom: 5,
                          }}>
                            {pixInfo.checkout_url}
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              onClick={() => { navigator.clipboard.writeText(pixInfo!.checkout_url!) }}
                              style={{ flex: 1, padding: '5px 0', fontSize: 10, background: '#7B3FE4', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}
                            >
                              📋 Copiar link
                            </button>
                            <button
                              onClick={() => window.open(pixInfo!.checkout_url!, '_blank')}
                              style={{ flex: 1, padding: '5px 0', fontSize: 10, background: '#2C2C2E', color: '#aaa', border: 'none', borderRadius: 5, cursor: 'pointer', fontWeight: 600 }}
                            >
                              🔗 Abrir
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, color: '#71717A', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Log de atividade</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {activityLog.map((log, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ fontSize: 11, color: log.color, flexShrink: 0 }}>{log.icon}</span>
                          <div>
                            <div style={{ fontSize: 10, color: '#A1A1AA', lineHeight: 1.3 }}>{log.label}</div>
                            {log.time && <div style={{ fontSize: 9, color: '#444' }}>{log.time}</div>}
                          </div>
                        </div>
                      ))}
                      {activityLog.length === 0 && <div style={{ fontSize: 10, color: '#444' }}>Sem atividade recente</div>}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#444' }}>Selecione um lead para ver a inteligência</div>
                </div>
              )}
            </div>

          </div>{/* end 3-col */}
        </div>{/* end right col */}
      </div>{/* end outer */}
    </ErrorBoundary>
  )
}
