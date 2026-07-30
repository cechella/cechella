// [SYNC] Gerado automaticamente de admin/referidos — NÃO editar manualmente
// Para atualizar: Admin → Sistema → Sincronizar
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import { Flame, Circle, Phone, RefreshCw, Search, CheckCircle, Clock, PhoneCall, Copy, Check, CreditCard, Users, TrendingUp, Pencil, X, Bot, UserCheck, ToggleLeft, ToggleRight } from 'lucide-react'

type StatusReferido = 'aguardando' | 'mensagem_enviada' | 'contatado' | 'fechado'
type FiltroPrioridade = 'todas' | '1' | '2'
type FiltroStatus = 'todos' | StatusReferido
type TabAtiva = 'todos' | 'leads' | 'referidos'

interface Referido {
  id: string
  indicado_por_telefone: string | null
  indicado_por_nome: string | null
  nome: string | null
  telefone: string | null
  profissao: string | null
  hobby: string | null
  prioridade: number
  status: StatusReferido
  created_at: string
  tipo_envio: string | null
}

interface LeadNovo {
  id: string
  nome: string | null
  telefone: string | null
  origem: string | null
  created_at: string
}

interface Consultor {
  id: string
  name: string | null
  whatsapp: string | null
}

const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text'
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'

const statusConfig: Record<StatusReferido, { label: string; color: string; icon: React.ReactNode }> = {
  aguardando: {
    label: 'Aguardando',
    color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    icon: <Clock className="w-3 h-3" />,
  },
  mensagem_enviada: {
    label: 'Aguardando',
    color: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
    icon: <Clock className="w-3 h-3" />,
  },
  contatado: {
    label: 'Contatado',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: <PhoneCall className="w-3 h-3" />,
  },
  fechado: {
    label: 'Fechado',
    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    icon: <CheckCircle className="w-3 h-3" />,
  },
}

function isNovo(data: string) {
  const diff = Date.now() - new Date(data).getTime()
  return diff < 24 * 60 * 60 * 1000
}

function getInitials(name: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-purple-500/30 text-purple-300',
  'bg-blue-500/30 text-blue-300',
  'bg-emerald-500/30 text-emerald-300',
  'bg-amber-500/30 text-amber-300',
  'bg-pink-500/30 text-pink-300',
  'bg-cyan-500/30 text-cyan-300',
]

function avatarColor(name: string | null) {
  if (!name) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function CopyPhone({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(phone)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  return (
    <button
      onClick={handleCopy}
      className="ml-1.5 p-1 rounded text-[#52525B] hover:text-[#A1A1AA] hover:bg-[#1C1C1E] transition-colors"
      title="Copiar número"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

function tempoRelativo(data: string) {
  const diff = Date.now() - new Date(data).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d}d`
}

function OrigemBadge({ origem }: { origem: string | null }) {
  if (origem === 'instagram') return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">📸 Instagram</span>
  if (origem === 'landing_page') return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">🌐 Landing Page</span>
  if (origem === 'manual') return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">✏️ Manual</span>
  return <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">🔗 {origem || 'Desconhecido'}</span>
}

function montarMensagemAna(ref: Referido, nomeIndicador: string): string {
  const nome = (ref.nome || '').split(' ')[0] || 'Olá'
  let contexto = 'Sei que você é uma pessoa especial e que merece se sentir com energia e disposição todos os dias.'
  if (ref.profissao) {
    const p = ref.profissao.toLowerCase()
    if (p.includes('médic') || p.includes('medic') || p.includes('dentist')) {
      contexto = 'Como profissional da saúde, você certamente entende a importância do equilíbrio hormonal para uma vida de alta performance.'
    } else if (p.includes('empresári') || p.includes('diretor') || p.includes('ceo')) {
      contexto = 'Como empresária, seu nível de energia e foco impactam diretamente seus resultados.'
    } else if (p.includes('professor') || p.includes('psicolog')) {
      contexto = 'Com sua rotina exigente, o equilíbrio hormonal faz toda diferença no seu bem-estar e disposição.'
    }
  }
  return `Oi ${nome}! 🌿\n\nSou a Ana, assistente da Clínica do Dr. Vinícius Cechella.\n\n${nomeIndicador.split(' ')[0]} me passou seu contato com muito carinho. ❤️\n\n${contexto}\n\nO Dr. Vinícius é especialista em Medicina do Estilo de Vida e tem ajudado mulheres como você a recuperarem energia, libido, sono de qualidade e leveza — através de um protocolo personalizado de reposição hormonal.\n\nPosso te contar mais sobre como funciona? São apenas alguns minutos e sem compromisso. 😊`
}

function montarMensagemAnaLead(lead: LeadNovo): string {
  const nome = (lead.nome || '').split(' ')[0] || 'Olá'
  return `Oi ${nome}! 😊\n\nSou a Ana, consultora do Dr. Vinícius Cechella aqui na Hormone Ecosystem.\n\nVi que você demonstrou interesse no implante hormonal e adoraria te contar como tem transformado a vida de tantas mulheres!\n\nPosso te explicar rapidinho como funciona? São só alguns minutinhos e sem compromisso. 🌸`
}

export default function ReferidosPage() {
  const [referidos, setReferidos] = useState<Referido[]>([])
  const [leadsNovos, setLeadsNovos] = useState<LeadNovo[]>([])
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>('todos')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroPrioridade, setFiltroPrioridade] = useState<FiltroPrioridade>('todas')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')
  const [filtroIndicador, setFiltroIndicador] = useState<string>('todos')
  const [atualizando, setAtualizando] = useState<string | null>(null)

  // Seleção múltipla
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  // Edição inline
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ nome: string; telefone: string; profissao: string; hobby: string }>({ nome: '', telefone: '', profissao: '', hobby: '' })
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)

  // Acionar Ana
  const [acionandoAna, setAcionandoAna] = useState<string | null>(null)
  const [acionandoLote, setAcionandoLote] = useState(false)

  // Notificar consultor
  const [notificando, setNotificando] = useState<string | null>(null)
  const [notificandoLote, setNotificandoLote] = useState(false)
  const [consultores, setConsultores] = useState<Consultor[]>([])

  // Toggle auto Ana
  const [autoAna, setAutoAna] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('autoAna') !== 'off'
    return true
  })

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const carregar = useCallback(async () => {
    setLoading(true)

    // Busca referidos (existente — sem alteração)
    const { data } = await supabase
      .from('contatos_referidos')
      .select('*')
      .order('prioridade', { ascending: true })
      .order('created_at', { ascending: false })
    if (data) setReferidos(data as Referido[])

    // Busca leads sem conversa iniciada (NOVO — adicional)
    const { data: leadsData } = await supabase
      .from('leads')
      .select('id, nome, telefone, origem, created_at, historico')
      .order('created_at', { ascending: false })
      .limit(100)
    if (leadsData) {
      const semConversa = leadsData.filter(l =>
        !l.historico || !Array.isArray(l.historico) || l.historico.length === 0
      )
      setLeadsNovos(semConversa as LeadNovo[])
    }

    const { data: profs } = await supabase
      .from('profiles')
      .select('id, name, whatsapp')
      .eq('role', 'sales')
    if (profs) setConsultores(profs as Consultor[])

    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  const atualizarStatus = async (id: string, status: StatusReferido) => {
    setAtualizando(id)
    await supabase.from('contatos_referidos').update({ status }).eq('id', id)
    setReferidos(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setAtualizando(null)
  }

  // Edição inline
  const iniciarEdicao = (ref: Referido) => {
    setEditandoId(ref.id)
    setEditForm({
      nome: ref.nome || '',
      telefone: ref.telefone || '',
      profissao: ref.profissao || '',
      hobby: ref.hobby || '',
    })
  }

  const salvarEdicao = async (id: string) => {
    setSalvandoEdicao(true)
    const { error } = await supabase.from('contatos_referidos').update({
      nome: editForm.nome || null,
      telefone: editForm.telefone || null,
      profissao: editForm.profissao || null,
      hobby: editForm.hobby || null,
      prioridade: (editForm.profissao && editForm.hobby) ? 1 : 2,
    }).eq('id', id)
    if (!error) {
      setReferidos(prev => prev.map(r => r.id === id ? {
        ...r,
        nome: editForm.nome || null,
        telefone: editForm.telefone || null,
        profissao: editForm.profissao || null,
        hobby: editForm.hobby || null,
        prioridade: (editForm.profissao && editForm.hobby) ? 1 : 2,
      } : r))
      showToast('Dados salvos com sucesso!')
    } else {
      showToast('Erro ao salvar', 'err')
    }
    setEditandoId(null)
    setSalvandoEdicao(false)
  }

  // Acionar Ana para referido (existente — sem alteração)
  const acionarAna = async (ref: Referido) => {
    if (!ref.telefone) return showToast('Referido sem telefone', 'err')
    setAcionandoAna(ref.id)
    const nomeInd = ref.indicado_por_nome || 'uma amiga'
    const mensagem = montarMensagemAna(ref, nomeInd)
    const tel = ref.telefone.replace(/\D/g, '')
    try {
      const res = await fetch(ZAPI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
        body: JSON.stringify({ phone: `55${tel}`, message: mensagem }),
      })
      if (res.ok) {
        await supabase.from('contatos_referidos').update({ status: 'contatado' }).eq('id', ref.id)
        setReferidos(prev => prev.map(r => r.id === ref.id ? { ...r, status: 'contatado' } : r))
        showToast(`Ana acionada para ${ref.nome || ref.telefone}!`)
      } else {
        showToast('Erro ao acionar Ana', 'err')
      }
    } catch {
      showToast('Erro de conexão', 'err')
    }
    setAcionandoAna(null)
  }

  // Acionar Ana para lead (NOVO)
  const acionarAnaLead = async (lead: LeadNovo) => {
    if (!lead.telefone) return showToast('Lead sem telefone', 'err')
    setAcionandoAna(lead.id)
    const mensagem = montarMensagemAnaLead(lead)
    const tel = lead.telefone.replace(/\D/g, '')
    try {
      const res = await fetch(ZAPI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
        body: JSON.stringify({ phone: tel, message: mensagem }),
      })
      if (res.ok) {
        setLeadsNovos(prev => prev.filter(l => l.id !== lead.id))
        showToast(`Ana acionada para ${lead.nome || lead.telefone}!`)
      } else {
        showToast('Erro ao acionar Ana', 'err')
      }
    } catch {
      showToast('Erro de conexão', 'err')
    }
    setAcionandoAna(null)
  }

  // Acionar Ana em lote (existente — sem alteração)
  const acionarAnaLote = async () => {
    const alvos = referidos.filter(r => selecionados.has(r.id) && (r.status === 'aguardando' || r.status === 'mensagem_enviada') && r.telefone)
    if (alvos.length === 0) return showToast('Nenhum referido aguardando com telefone', 'err')
    setAcionandoLote(true)
    let ok = 0
    for (const ref of alvos) {
      const mensagem = montarMensagemAna(ref, ref.indicado_por_nome || 'uma amiga')
      const tel = ref.telefone!.replace(/\D/g, '')
      try {
        const res = await fetch(ZAPI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
          body: JSON.stringify({ phone: `55${tel}`, message: mensagem }),
        })
        if (res.ok) {
          await supabase.from('contatos_referidos').update({ status: 'contatado' }).eq('id', ref.id)
          setReferidos(prev => prev.map(r => r.id === ref.id ? { ...r, status: 'contatado' } : r))
          ok++
        }
      } catch {}
      await new Promise(r => setTimeout(r, 1500))
    }
    showToast(`Ana acionada para ${ok} referidos!`)
    setSelecionados(new Set())
    setAcionandoLote(false)
  }

  // Notificar consultor (individual — existente)
  const notificarConsultor = async (ref: Referido) => {
    if (consultores.length === 0) return showToast('Nenhum consultor cadastrado', 'err')
    setNotificando(ref.id)
    // Distribui round-robin entre consultores disponíveis
    const idx = referidos.indexOf(ref) % consultores.length
    const consultor = consultores[idx]
    if (!consultor.whatsapp) return showToast('Consultor sem WhatsApp cadastrado', 'err')
    const msg = `👥 *Lead para contato — Hormone Ecosystem*\n\n📋 *Nome:* ${ref.nome || '—'}\n📱 *Telefone:* ${ref.telefone || '—'}\n👤 *Indicado por:* ${ref.indicado_por_nome || '—'}\n💼 *Profissão:* ${ref.profissao || '—'}\n🎯 *Status:* ${ref.status}\n\n⚡ Entre em contato agora:\nhttps://wa.me/55${(ref.telefone || '').replace(/\D/g, '')}`
    try {
      const res = await fetch(ZAPI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
        body: JSON.stringify({ phone: consultor.whatsapp, message: msg }),
      })
      if (res.ok) showToast(`Consultor ${consultor.name || ''} notificado!`)
      else showToast('Erro ao notificar consultor', 'err')
    } catch {
      showToast('Erro de conexão', 'err')
    }
    setNotificando(null)
  }

  // Notificar consultores em lote (existente)
  const notificarLote = async () => {
    const alvos = referidos.filter(r => selecionados.has(r.id))
    if (alvos.length === 0 || consultores.length === 0) return showToast('Selecione referidos e verifique consultores', 'err')
    setNotificandoLote(true)
    let ok = 0
    for (let i = 0; i < alvos.length; i++) {
      const ref = alvos[i]
      const consultor = consultores[i % consultores.length]
      if (!consultor.whatsapp) continue
      const msg = `👥 *Lead para contato — Hormone Ecosystem*\n\n📋 *Nome:* ${ref.nome || '—'}\n📱 *Telefone:* ${ref.telefone || '—'}\n👤 *Indicado por:* ${ref.indicado_por_nome || '—'}\n💼 *Profissão:* ${ref.profissao || '—'}\n\n⚡ Entre em contato agora:\nhttps://wa.me/55${(ref.telefone || '').replace(/\D/g, '')}`
      try {
        const res = await fetch(ZAPI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
          body: JSON.stringify({ phone: consultor.whatsapp, message: msg }),
        })
        if (res.ok) ok++
      } catch {}
      await new Promise(r => setTimeout(r, 1000))
    }
    showToast(`${ok} leads distribuídos entre ${consultores.length} consultor(es)!`)
    setSelecionados(new Set())
    setNotificandoLote(false)
  }

  const toggleAutoAna = () => {
    const novo = !autoAna
    setAutoAna(novo)
    localStorage.setItem('autoAna', novo ? 'on' : 'off')
    showToast(novo ? 'Auto Ana ATIVADO' : 'Auto Ana DESATIVADO', novo ? 'ok' : 'err')
  }

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleTodos = () => {
    if (selecionados.size === filtrados.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(filtrados.map(r => r.id)))
    }
  }

  const indicadores = Array.from(new Set<string>(referidos.map(r => r.indicado_por_nome).filter((x): x is string => Boolean(x))))

  const filtrados = referidos.filter(r => {
    const matchSearch =
      (r.nome || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.telefone || '').includes(search) ||
      (r.profissao || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.indicado_por_nome || '').toLowerCase().includes(search.toLowerCase())
    const matchPrioridade = filtroPrioridade === 'todas' || String(r.prioridade) === filtroPrioridade
    const matchStatus = filtroStatus === 'todos' || r.status === filtroStatus
    const matchIndicador = filtroIndicador === 'todos' || r.indicado_por_nome === filtroIndicador
    return matchSearch && matchPrioridade && matchStatus && matchIndicador
  })

  const filtradosLeads = leadsNovos.filter(l =>
    (l.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.telefone || '').includes(search) ||
    (l.origem || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalAlta = referidos.filter(r => r.prioridade === 1).length
  const totalNormal = referidos.filter(r => r.prioridade === 2).length
  const totalAguardando = referidos.filter(r => r.status === 'aguardando').length
  const totalContatado = referidos.filter(r => r.status === 'contatado').length
  const totalFechado = referidos.filter(r => r.status === 'fechado').length

  const bySource: Record<string, number> = {}
  for (const r of referidos) {
    const key = r.indicado_por_nome || 'Desconhecido'
    bySource[key] = (bySource[key] || 0) + 1
  }
  const topSources = Object.entries(bySource).sort((a, b) => b[1] - a[1]).slice(0, 4)

  const total = referidos.length
  const pctAguardando = total ? Math.round((totalAguardando / total) * 100) : 0
  const pctContatado = total ? Math.round((totalContatado / total) * 100) : 0
  const pctFechado = total ? Math.round((totalFechado / total) * 100) : 0

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Contatos IA" />
        <main className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Toast */}
          {toast && (
            <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border transition-all ${toast.type === 'ok' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
              {toast.msg}
            </div>
          )}

          {/* Summary Banner */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#7B3FE4]/10 rounded-xl">
                  <Users className="w-5 h-5 text-[#7B3FE4]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{total + leadsNovos.length}</p>
                  <p className="text-xs text-[#71717A]">{leadsNovos.length} lead{leadsNovos.length !== 1 ? 's' : ''} + {total} referido{total !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {topSources.map(([name, count]) => (
                  <div key={name} className="flex items-center gap-2 bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor(name)}`}>
                      {getInitials(name)}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white leading-tight">{name}</p>
                      <p className="text-[10px] text-[#71717A]">{count} indicado{count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}

                {/* Toggle Auto Ana */}
                <button
                  onClick={toggleAutoAna}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 border transition-all ${autoAna ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#18181A] border-[#1C1C1E]'}`}
                >
                  {autoAna ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-[#71717A]" />}
                  <div className="text-left">
                    <p className={`text-xs font-medium ${autoAna ? 'text-emerald-400' : 'text-[#71717A]'}`}>
                      Ana: Auto {autoAna ? 'ON' : 'OFF'}
                    </p>
                    <p className="text-[10px] text-[#71717A]">aciona novos auto</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Pipeline progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#71717A]">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Pipeline de conversão — referidos</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" /> Aguardando {pctAguardando}%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Contatado {pctContatado}%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Fechado {pctFechado}%</span>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-[#1C1C1E] overflow-hidden flex">
                {totalAguardando > 0 && <div className="h-full bg-zinc-500 transition-all" style={{ width: `${pctAguardando}%` }} />}
                {totalContatado > 0 && <div className="h-full bg-blue-500 transition-all" style={{ width: `${pctContatado}%` }} />}
                {totalFechado > 0 && <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pctFechado}%` }} />}
              </div>
              <div className="flex gap-4 text-[11px] text-[#71717A]">
                <span>{totalAguardando} aguardando</span>
                <span>{totalContatado} contatado{totalContatado !== 1 ? 's' : ''}</span>
                <span>{totalFechado} fechado{totalFechado !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Leads aguardando', value: leadsNovos.length, color: 'text-purple-400' },
              { label: 'Total Referidos', value: referidos.length, color: 'text-white' },
              { label: 'Prioridade Alta', value: totalAlta, color: 'text-red-400', sub: 'profissão + hobby' },
              { label: 'Aguardando', value: totalAguardando, color: 'text-zinc-400' },
              { label: 'Fechados', value: totalFechado, color: 'text-emerald-400' },
            ].map(m => (
              <div key={m.label} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-[#71717A] mt-0.5">{m.label}</p>
                {m.sub && <p className="text-[10px] text-[#3B82F6] mt-0.5">{m.sub}</p>}
              </div>
            ))}
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, telefone, profissão..."
                className="w-full bg-[#111113] border border-[#1C1C1E] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#7B3FE4]"
              />
            </div>
            {tabAtiva !== 'leads' && (
              <>
                <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value as FiltroPrioridade)} className="bg-[#111113] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]">
                  <option value="todas">Prioridade</option>
                  <option value="1">Alta (profissão+hobby)</option>
                  <option value="2">Normal</option>
                </select>
                <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as FiltroStatus)} className="bg-[#111113] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]">
                  <option value="todos">Status</option>
                  <option value="aguardando">Aguardando</option>
                  <option value="contatado">Contatado</option>
                  <option value="fechado">Fechado</option>
                </select>
                <select value={filtroIndicador} onChange={e => setFiltroIndicador(e.target.value)} className="bg-[#111113] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]">
                  <option value="todos">Indicado por</option>
                  {indicadores.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </>
            )}
            <button onClick={carregar} className="p-2.5 bg-[#111113] border border-[#1C1C1E] rounded-xl text-[#71717A] hover:text-white hover:border-[#7B3FE4] transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#111113] border border-[#1C1C1E] rounded-xl p-1 w-fit">
            {([
              { key: 'todos', label: `Todos (${filtradosLeads.length + filtrados.length})` },
              { key: 'leads', label: `Leads (${filtradosLeads.length})` },
              { key: 'referidos', label: `Referidos (${filtrados.length})` },
            ] as { key: TabAtiva; label: string }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setTabAtiva(tab.key)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tabAtiva === tab.key ? 'bg-[#7B3FE4] text-white' : 'text-[#71717A] hover:text-white'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Barra de ações em lote (referidos) */}
          {selecionados.size > 0 && (
            <div className="flex items-center gap-3 bg-[#7B3FE4]/10 border border-[#7B3FE4]/30 rounded-xl px-4 py-2.5">
              <span className="text-xs text-[#A78BFA] font-medium">{selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''}</span>
              <div className="flex-1 flex items-center gap-2">
                <button
                  onClick={acionarAnaLote}
                  disabled={acionandoLote}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#7B3FE4]/20 hover:bg-[#7B3FE4]/30 text-[#A78BFA] border border-[#7B3FE4]/40 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Bot className="w-3.5 h-3.5" />
                  {acionandoLote ? 'Acionando...' : 'Acionar Ana para selecionados'}
                </button>
                <button
                  onClick={notificarLote}
                  disabled={notificandoLote}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg transition-colors disabled:opacity-50"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  {notificandoLote ? 'Notificando...' : `Distribuir para ${consultores.length} consultor${consultores.length !== 1 ? 'es' : ''}`}
                </button>
              </div>
              <button onClick={() => setSelecionados(new Set())} className="text-xs text-[#71717A] hover:text-white">Limpar seleção</button>
            </div>
          )}

          {/* ── SEÇÃO LEADS (tab todos ou leads) ── */}
          {(tabAtiva === 'todos' || tabAtiva === 'leads') && (
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1C1C1E]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                  <h2 className="text-sm font-semibold text-white">Leads aguardando contato</h2>
                  <span className="text-xs text-[#71717A] ml-1">— sem conversa iniciada</span>
                </div>
                <span className="text-xs text-[#71717A]">{filtradosLeads.length} lead{filtradosLeads.length !== 1 ? 's' : ''}</span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-5 h-5 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtradosLeads.length === 0 ? (
                <div className="text-center py-10 text-[#71717A]">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum lead aguardando</p>
                  <p className="text-xs mt-1">Leads com conversa iniciada aparecem no Agente IA</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1C1C1E]">
                        <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Nome</th>
                        <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Telefone</th>
                        <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Origem</th>
                        <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Recebido</th>
                        <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtradosLeads.map(lead => {
                        const novo = isNovo(lead.created_at)
                        return (
                          <tr key={lead.id} className="border-b border-[#1C1C1E] hover:bg-[#18181A] transition-colors border-l-2 border-l-purple-500">
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor(lead.nome)}`}>
                                  {getInitials(lead.nome)}
                                </div>
                                <p className="text-sm font-medium text-white">{lead.nome || '—'}</p>
                                {novo && (
                                  <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#7B3FE4]/20 text-[#A78BFA] border border-[#7B3FE4]/30">Novo</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center">
                                <p className="text-xs text-[#A1A1AA] font-mono">{lead.telefone || '—'}</p>
                                {lead.telefone && <CopyPhone phone={lead.telefone} />}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <OrigemBadge origem={lead.origem} />
                            </td>
                            <td className="px-4 py-4 text-xs text-[#71717A]">
                              {tempoRelativo(lead.created_at)}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => acionarAnaLead(lead)}
                                  disabled={acionandoAna === lead.id}
                                  className="flex items-center gap-1 text-xs px-2 py-1.5 bg-[#7B3FE4]/20 hover:bg-[#7B3FE4]/30 text-[#A78BFA] border border-[#7B3FE4]/30 rounded-lg transition-colors disabled:opacity-50"
                                  title="Acionar Ana agora"
                                >
                                  <Bot className="w-3 h-3" />
                                  {acionandoAna === lead.id ? '...' : 'Acionar Ana'}
                                </button>
                                {lead.telefone && (
                                  <a
                                    href={`https://wa.me/${lead.telefone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-[#71717A] hover:text-green-400 hover:bg-[#1C1C1E] rounded-lg transition-colors"
                                    title="Abrir WhatsApp"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── SEÇÃO REFERIDOS (tab todos ou referidos) ── */}
          {(tabAtiva === 'todos' || tabAtiva === 'referidos') && (
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#1C1C1E]">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selecionados.size === filtrados.length && filtrados.length > 0}
                    onChange={toggleTodos}
                    className="w-4 h-4 rounded accent-[#7B3FE4] cursor-pointer"
                  />
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    <h2 className="text-sm font-semibold text-white">{filtrados.length} referidos</h2>
                  </div>
                </div>
                <span className="text-xs text-[#71717A]">{totalContatado} contatados · {totalFechado} fechados</span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtrados.length === 0 ? (
                <div className="text-center py-16 text-[#71717A]">
                  <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhum referido encontrado</p>
                  <p className="text-xs mt-1">Os referidos aparecem aqui quando Ana coleta na Etapa 7</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1C1C1E]">
                        <th className="px-4 py-3 w-8"></th>
                        <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Prioridade</th>
                        <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Nome</th>
                        <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Telefone</th>
                        <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Tipo</th>
                        <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Profissão</th>
                        <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Hobby</th>
                        <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Indicado por</th>
                        <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Status</th>
                        <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Recebido</th>
                        <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtrados.map(ref => {
                        const isAlta = ref.prioridade === 1
                        const sc = statusConfig[ref.status] || statusConfig.aguardando
                        const isViaCartao = (ref.tipo_envio === 'cartao' || !ref.tipo_envio) && !ref.profissao && !ref.hobby
                        const novo = isNovo(ref.created_at)
                        const borderColor = isAlta ? 'border-l-red-500' : 'border-l-yellow-500'
                        const emEdicao = editandoId === ref.id
                        const selecionado = selecionados.has(ref.id)

                        return (
                          <tr
                            key={ref.id}
                            className={`border-b border-[#1C1C1E] transition-colors border-l-2 ${borderColor} ${emEdicao ? 'bg-[#7B3FE4]/5' : selecionado ? 'bg-[#7B3FE4]/5' : 'hover:bg-[#18181A]'}`}
                          >
                            {/* Checkbox */}
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selecionado}
                                onChange={() => toggleSelecionado(ref.id)}
                                className="w-4 h-4 rounded accent-[#7B3FE4] cursor-pointer"
                              />
                            </td>

                            {/* Prioridade */}
                            <td className="px-4 py-4">
                              {isAlta ? (
                                <div className="flex items-center gap-1.5">
                                  <Flame className="w-4 h-4 text-red-400" />
                                  <span className="text-xs font-medium text-red-400">Alta</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <Circle className="w-4 h-4 text-yellow-400" />
                                  <span className="text-xs font-medium text-yellow-400">Normal</span>
                                </div>
                              )}
                            </td>

                            {/* Nome */}
                            <td className="px-4 py-4">
                              {emEdicao ? (
                                <input
                                  value={editForm.nome}
                                  onChange={e => setEditForm(f => ({ ...f, nome: e.target.value }))}
                                  className="bg-[#1C1C1E] border border-[#7B3FE4]/50 rounded-lg px-2 py-1 text-sm text-white w-40 focus:outline-none focus:border-[#7B3FE4]"
                                />
                              ) : (
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-white">{ref.nome || '—'}</p>
                                  {novo && (
                                    <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#7B3FE4]/20 text-[#A78BFA] border border-[#7B3FE4]/30">
                                      Novo
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Telefone */}
                            <td className="px-4 py-4">
                              {emEdicao ? (
                                <input
                                  value={editForm.telefone}
                                  onChange={e => setEditForm(f => ({ ...f, telefone: e.target.value }))}
                                  className="bg-[#1C1C1E] border border-[#7B3FE4]/50 rounded-lg px-2 py-1 text-xs text-white font-mono w-36 focus:outline-none focus:border-[#7B3FE4]"
                                />
                              ) : (
                                <div className="flex items-center">
                                  <p className="text-xs text-[#A1A1AA] font-mono">{ref.telefone || '—'}</p>
                                  {ref.telefone && <CopyPhone phone={ref.telefone} />}
                                </div>
                              )}
                            </td>

                            {/* Tipo */}
                            <td className="px-4 py-4">
                              {ref.tipo_envio === 'lista' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  <Users className="w-2.5 h-2.5" />
                                  Lista
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-[#1C1C1E] text-[#52525B] border border-[#27272A]">
                                  <CreditCard className="w-2.5 h-2.5" />
                                  Via cartão
                                </span>
                              )}
                            </td>

                            {/* Profissão */}
                            <td className="px-4 py-4">
                              {emEdicao ? (
                                <input
                                  value={editForm.profissao}
                                  onChange={e => setEditForm(f => ({ ...f, profissao: e.target.value }))}
                                  placeholder="Profissão..."
                                  className="bg-[#1C1C1E] border border-[#7B3FE4]/50 rounded-lg px-2 py-1 text-xs text-white w-28 focus:outline-none focus:border-[#7B3FE4]"
                                />
                              ) : (
                                <p className="text-xs text-white">{ref.profissao || <span className="text-[#71717A]">—</span>}</p>
                              )}
                            </td>

                            {/* Hobby */}
                            <td className="px-4 py-4">
                              {emEdicao ? (
                                <input
                                  value={editForm.hobby}
                                  onChange={e => setEditForm(f => ({ ...f, hobby: e.target.value }))}
                                  placeholder="Hobby..."
                                  className="bg-[#1C1C1E] border border-[#7B3FE4]/50 rounded-lg px-2 py-1 text-xs text-white w-24 focus:outline-none focus:border-[#7B3FE4]"
                                />
                              ) : (
                                <p className="text-xs text-white">{ref.hobby || <span className="text-[#71717A]">—</span>}</p>
                              )}
                            </td>

                            {/* Indicado por */}
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor(ref.indicado_por_nome)}`}>
                                  {getInitials(ref.indicado_por_nome)}
                                </div>
                                <p className="text-xs text-[#A1A1AA]">{ref.indicado_por_nome || '—'}</p>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-4 py-4">
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border ${sc.color}`}>
                                {sc.icon}
                                {sc.label}
                              </span>
                            </td>

                            {/* Recebido */}
                            <td className="px-4 py-4 text-xs text-[#71717A]">
                              {tempoRelativo(ref.created_at)}
                            </td>

                            {/* Ações */}
                            <td className="px-4 py-4">
                              {emEdicao ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => salvarEdicao(ref.id)}
                                    disabled={salvandoEdicao}
                                    className="text-xs px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-50 font-medium"
                                  >
                                    {salvandoEdicao ? '...' : '✓ Salvar'}
                                  </button>
                                  <button
                                    onClick={() => setEditandoId(null)}
                                    className="p-1.5 text-[#71717A] hover:text-white hover:bg-[#1C1C1E] rounded-lg transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  {/* Acionar Ana */}
                                  {(ref.status === 'aguardando' || ref.status === 'mensagem_enviada') && (
                                    <button
                                      onClick={() => acionarAna(ref)}
                                      disabled={acionandoAna === ref.id}
                                      className="flex items-center gap-1 text-xs px-2 py-1.5 bg-[#7B3FE4]/20 hover:bg-[#7B3FE4]/30 text-[#A78BFA] border border-[#7B3FE4]/30 rounded-lg transition-colors disabled:opacity-50"
                                      title="Acionar Ana agora"
                                    >
                                      <Bot className="w-3 h-3" />
                                      {acionandoAna === ref.id ? '...' : 'Ana'}
                                    </button>
                                  )}
                                  {/* Status buttons */}
                                  {(ref.status === 'aguardando' || ref.status === 'mensagem_enviada') && acionandoAna !== ref.id && (
                                    <button
                                      onClick={() => atualizarStatus(ref.id, 'contatado')}
                                      disabled={atualizando === ref.id}
                                      className="text-xs px-2 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                      {atualizando === ref.id ? '...' : 'Contatar'}
                                    </button>
                                  )}
                                  {ref.status === 'contatado' && (
                                    <button
                                      onClick={() => atualizarStatus(ref.id, 'fechado')}
                                      disabled={atualizando === ref.id}
                                      className="text-xs px-2 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
                                    >
                                      {atualizando === ref.id ? '...' : 'Fechado'}
                                    </button>
                                  )}
                                  {/* Editar */}
                                  <button
                                    onClick={() => iniciarEdicao(ref)}
                                    className="p-1.5 text-[#71717A] hover:text-white hover:bg-[#1C1C1E] rounded-lg transition-colors"
                                    title="Editar dados"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  {/* WhatsApp */}
                                  {ref.telefone && (
                                    <a
                                      href={`https://wa.me/55${ref.telefone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 text-[#71717A] hover:text-green-400 hover:bg-[#1C1C1E] rounded-lg transition-colors"
                                      title="Abrir WhatsApp"
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  {/* Notificar consultor */}
                                  <button
                                    onClick={() => notificarConsultor(ref)}
                                    disabled={notificando === ref.id}
                                    className="p-1.5 text-[#71717A] hover:text-amber-400 hover:bg-[#1C1C1E] rounded-lg transition-colors disabled:opacity-50"
                                    title="Notificar consultor"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
