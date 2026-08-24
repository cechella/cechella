'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import {
  MessageSquare, Phone, Search, RefreshCw, Link,
  Flame, Minus, Snowflake, X, Plus, Eye,
  Users, CheckCircle, Share2, ShieldAlert, Ban, PauseCircle, RotateCcw,
  MoreVertical, Trash2, Scale, PhoneCall, ChevronDown, ChevronUp, ChevronsUpDown, Download
} from 'lucide-react'

type Temperatura = 'quente' | 'morno' | 'frio'
type StatusLead = 'ativo' | 'opt_out' | 'pausado' | 'ameaca'

interface Lead {
  id: string
  nome: string | null
  telefone: string | null
  etapa_agente: number | null
  temperatura: Temperatura
  total_referidos: number | null
  updated_at: string
  dor_principal: string | null
  historico: Array<{role: string; content: string; ts?: string}> | null
  origem: string | null
  status: StatusLead | null
  atendimento_humano: boolean | null
}

interface ContatoReferido {
  id: string
  nome: string | null
  telefone: string | null
  profissao: string | null
  hobby: string | null
  status: string
  indicado_por_telefone: string | null
  indicado_por_nome: string | null
  created_at: string
}

const etapaAgentLabels: Record<number, string> = {
  1: 'Apresentação', 2: 'Conexão', 3: 'D.I.', 4: 'Speech',
  5: 'Fechamento', 6: 'Pag. Pendente', 7: 'Referidos', 8: 'Validação'
}
const etapaAgentColors: Record<number, string> = {
  1: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  2: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  3: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  4: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  5: 'bg-red-500/20 text-red-400 border-red-500/30',
  6: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  7: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  8: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
}

const statusContatoColors: Record<string, string> = {
  aguardando: 'bg-yellow-500/20 text-yellow-400',
  contatado: 'bg-blue-500/20 text-blue-400',
  interessado: 'bg-orange-500/20 text-orange-400',
  vendido: 'bg-emerald-500/20 text-emerald-400',
}

function calcScore(profissao: string | null | undefined, hobby: string | null | undefined): number {
  const prof = (profissao || '').toLowerCase()
  let renda = 1
  if (/médic|medic|dentist|advogad|empresár|empresar|jogador|diretor|engenheiro|arquitet|farmacêut/.test(prof)) renda = 5
  else if (/enfermeir|fisio|psicólog|psicolog|nutricionist|veterinár/.test(prof)) renda = 3
  else if (/professor|comerciant|secretár|recepcion|vendedor|técnic|tecnic|cabelerei/.test(prof)) renda = 2
  let dados = 0
  if (profissao && hobby) dados = 3
  else if (profissao || hobby) dados = 1
  return renda + dados
}

function scoreCircles(score: number): string {
  const filled = Math.round((score / 8) * 5)
  return '●'.repeat(filled) + '○'.repeat(5 - filled)
}

const ORIGEM_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  instagram:    { label: 'Instagram', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30', emoji: '📸' },
  referido:     { label: 'Referido',  color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30', emoji: '🔗' },
  landing_page: { label: 'Site',      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', emoji: '🌐' },
  google:       { label: 'Google',    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', emoji: '🔍' },
  whatsapp:     { label: 'WhatsApp',  color: 'bg-green-500/20 text-green-400 border-green-500/30', emoji: '💬' },
  manual:       { label: 'Manual',    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', emoji: '✍️' },
  organico:     { label: 'Orgânico',  color: 'bg-teal-500/20 text-teal-400 border-teal-500/30', emoji: '🌿' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ativo:    { label: 'Ativo',     color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: <CheckCircle className="w-3 h-3" /> },
  opt_out:  { label: 'Bloqueado', color: 'bg-red-500/20 text-red-400 border-red-500/30',             icon: <Ban className="w-3 h-3" /> },
  pausado:  { label: 'Pausado',   color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',   icon: <PauseCircle className="w-3 h-3" /> },
  ameaca:   { label: '⚠️ Ameaça', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',   icon: <ShieldAlert className="w-3 h-3" /> },
}

function StatusBadge({ status }: { status: StatusLead | null }) {
  const cfg = STATUS_CONFIG[status || 'ativo']
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function OrigemBadge({ origem }: { origem: string | null }) {
  const cfg = ORIGEM_CONFIG[origem || ''] || { label: origem || '—', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', emoji: '📌' }
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
      {cfg.emoji} {cfg.label}
    </span>
  )
}

function TemperaturaIcon({ t }: { t: Temperatura }) {
  if (t === 'quente') return <Flame className="w-4 h-4 text-red-400" />
  if (t === 'morno') return <Minus className="w-4 h-4 text-yellow-400" />
  return <Snowflake className="w-4 h-4 text-blue-400" />
}

function tempoRelativo(data: string | null) {
  if (!data) return '—'
  const diff = Date.now() - new Date(data).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `há ${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d}d`
}

type Aba = 'leads' | 'referidos'

export default function CRMPage() {
  const [aba, setAba] = useState<Aba>('leads')
  const [leads, setLeads] = useState<Lead[]>([])
  const [contatos, setContatos] = useState<ContatoReferido[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState<number | 0>(0)
  const [filtroTemp, setFiltroTemp] = useState<Temperatura | 'todas'>('todas')
  const [showModal, setShowModal] = useState(false)
  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null)
  const [showNovoLead, setShowNovoLead] = useState(false)
  const [novoLead, setNovoLead] = useState({ nome: '', telefone: '', etapa_agente: 1, temperatura: 'frio' as Temperatura })
  const [salvando, setSalvando] = useState(false)
  const [ligandoVoz, setLigandoVoz] = useState<string | null>(null)
  const [acionandoAna, setAcionandoAna] = useState<string | null>(null)
  const [filtroStatusRef, setFiltroStatusRef] = useState<string>('todos')

  const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text'
  const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'

  const acionarAna = async (lead: Lead) => {
    if (!lead.telefone) return
    if (lead.status === 'opt_out') return
    setAcionandoAna(lead.id)
    const tel = lead.telefone.replace(/\D/g, '')
    const mensagem = `Olá${lead.nome ? `, ${lead.nome}` : ''}! 👋 Aqui é a Ana, consultora do Hormone Ecosystem. Tudo bem com você? Queria retomar nossa conversa sobre o implante hormonal. Pode falar agora?`
    try {
      await fetch(ZAPI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
        body: JSON.stringify({ phone: tel, message: mensagem }),
      })
    } catch {}
    setAcionandoAna(null)
  }
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [ligandoVozLote, setLigandoVozLote] = useState(false)
  const [vozLoteProgresso, setVozLoteProgresso] = useState<{ atual: number; total: number } | null>(null)
  const [confirmarVozLote, setConfirmarVozLote] = useState<{ alvos: typeof leads } | null>(null)
  const [enviandoMsgLote, setEnviandoMsgLote] = useState(false)
  const [copiandoLink, setCopiandoLink] = useState<string | null>(null)

  const copiarLinkIndicacao = async (leadId: string) => {
    setCopiandoLink(leadId)
    try {
      const res = await fetch('/api/admin/gerar-link-indicacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      })
      const data = await res.json()
      if (data.url) {
        await navigator.clipboard.writeText(data.url)
      }
    } catch {}
    setTimeout(() => setCopiandoLink(null), 2000)
  }
  const [paginaAtual, setPaginaAtual] = useState(1)
  const POR_PAGINA = 50
  type Coluna = 'updated_at' | 'etapa_agente' | 'total_referidos'
  const [ordenacao, setOrdenacao] = useState<{ coluna: Coluna; direcao: 'asc' | 'desc' }>({ coluna: 'updated_at', direcao: 'desc' })

  const toggleOrdenacao = (coluna: Coluna) => {
    setOrdenacao(prev => prev.coluna === coluna
      ? { coluna, direcao: prev.direcao === 'desc' ? 'asc' : 'desc' }
      : { coluna, direcao: 'desc' }
    )
  }

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleTodos = () => {
    const ids = leadsFiltradosPaginados.map(l => l.id)
    const todosSelecionados = ids.every(id => selecionados.has(id))
    setSelecionados(prev => {
      const next = new Set(prev)
      todosSelecionados ? ids.forEach(id => next.delete(id)) : ids.forEach(id => next.add(id))
      return next
    })
  }

  const iniciarVozLote = () => {
    const alvos = leads.filter(l => selecionados.has(l.id) && l.telefone && l.status !== 'opt_out')
    if (alvos.length === 0) return
    setConfirmarVozLote({ alvos })
  }

  const ligarVozLote = async () => {
    const alvos = confirmarVozLote?.alvos ?? []
    setConfirmarVozLote(null)
    if (alvos.length === 0) return
    setLigandoVozLote(true)
    setVozLoteProgresso({ atual: 0, total: alvos.length })
    let ok = 0
    const CONCORRENCIA = 10
    for (let i = 0; i < alvos.length; i += CONCORRENCIA) {
      const lote = alvos.slice(i, i + CONCORRENCIA)
      await Promise.all(lote.map(async (lead) => {
        const tel = lead.telefone!.replace(/\D/g, '')
        try {
          const res = await fetch('/api/admin/vapi-call', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: `+55${tel}` }),
          })
          if (res.ok) ok++
        } catch {}
      }))
      setVozLoteProgresso({ atual: Math.min(i + CONCORRENCIA, alvos.length), total: alvos.length })
      if (i + CONCORRENCIA < alvos.length) await new Promise(r => setTimeout(r, 60000))
    }
    setSelecionados(new Set())
    setLigandoVozLote(false)
    setVozLoteProgresso(null)
  }

  const enviarMensagemLote = async () => {
    const alvos = leads.filter(l => selecionados.has(l.id) && l.telefone && l.status !== 'opt_out')
    if (alvos.length === 0) return
    setEnviandoMsgLote(true)
    let ok = 0
    await Promise.all(alvos.map(async (lead) => {
      const tel = lead.telefone!.replace(/\D/g, '')
      const mensagem = `Olá${lead.nome ? `, ${lead.nome}` : ''}! 👋 Aqui é a Ana, consultora do Hormone Ecosystem. Tudo bem com você? Queria retomar nossa conversa sobre o implante hormonal. Pode falar agora?`
      try {
        await fetch(ZAPI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
          body: JSON.stringify({ phone: tel, message: mensagem }),
        })
        ok++
      } catch {}
    }))
    setSelecionados(new Set())
    setEnviandoMsgLote(false)
  }

  const pausarLote = async () => {
    const ids = Array.from(selecionados)
    await Promise.all(ids.map(id => supabase.from('leads').update({ status: 'pausado' }).eq('id', id)))
    setLeads(prev => prev.map(l => selecionados.has(l.id) ? { ...l, status: 'pausado' as StatusLead } : l))
    setSelecionados(new Set())
  }

  const exportarCSV = () => {
    const alvos = selecionados.size > 0
      ? leads.filter(l => selecionados.has(l.id))
      : leadsFiltrados
    const linhas = [
      ['Nome', 'Telefone', 'Etapa', 'Temperatura', 'Origem', 'Referidos', 'Dor Principal', 'Status', 'Atualizado'],
      ...alvos.map(l => [
        l.nome || '',
        l.telefone || '',
        etapaAgentLabels[l.etapa_agente ?? 1] || '',
        l.temperatura,
        l.origem || '',
        String(l.total_referidos ?? 0),
        l.dor_principal || '',
        l.status || 'ativo',
        l.updated_at,
      ])
    ]
    const csv = linhas.map(row => row.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'leads.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const ligarVoz = async (telefone: string, id: string) => {
    if (!telefone) return
    setLigandoVoz(id)
    const tel = telefone.replace(/\D/g, '')
    try {
      await fetch('/api/admin/vapi-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: `+55${tel}` }),
      })
    } catch {}
    setLigandoVoz(null)
  }
  // ANA PTL + Distribuir (referidos tab)
  const [consultores, setConsultores] = useState<{id: string; name: string | null; whatsapp: string | null; ativos: number; cor: string}[]>([])
  const [ligandoAnaPtlRef, setLigandoAnaPtlRef] = useState<string | null>(null)
  const [modalDistribuirRef, setModalDistribuirRef] = useState<ContatoReferido | null>(null)
  const [consultorSelecionadoRef, setConsultorSelecionadoRef] = useState<string>('')
  const [notificarWppRef, setNotificarWppRef] = useState(true)
  const [distribuidoRefIds, setDistribuidoRefIds] = useState<Set<string>>(new Set())
  const [toastMsg, setToastMsg] = useState<{msg: string; ok: boolean} | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToastMsg({ msg, ok })
    setTimeout(() => setToastMsg(null), 3000)
  }

  const [filtroOrigem, setFiltroOrigem] = useState<string>('todas')
  const [filtroStatus, setFiltroStatus] = useState<StatusLead | 'todos'>('todos')
  const [menuAberto, setMenuAberto] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{x: number; y: number}>({x: 0, y: 0})

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const carregarLeads = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('leads')
      .select('id,nome,telefone,etapa_agente,temperatura,total_referidos,updated_at,dor_principal,historico,origem,status,atendimento_humano')
      .order('updated_at', { ascending: false })
    if (data) setLeads(data as Lead[])
    setLoading(false)
  }, [supabase])

  const carregarReferidos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('contatos_referidos')
      .select('id,nome,telefone,profissao,hobby,status,indicado_por_telefone,indicado_por_nome,created_at')
      .order('created_at', { ascending: false })
    if (data) setContatos(data as ContatoReferido[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    carregarLeads()
    carregarReferidos()
    supabase.from('comerciais').select('id, nome, telefone').eq('disponivel', true).then(async ({ data }) => {
      if (!data) return
      const { data: ativosData } = await supabase
        .from('contatos_referidos').select('assigned_comercial_id').not('assigned_comercial_id', 'is', null)
      const ativosCount: Record<string, number> = {}
      for (const r of (ativosData || [])) {
        if (r.assigned_comercial_id) ativosCount[r.assigned_comercial_id] = (ativosCount[r.assigned_comercial_id] || 0) + 1
      }
      const COMM_COLORS = ['#7B3FE4','#06B6D4','#10B981','#F59E0B','#EF4444','#3B82F6','#EC4899']
      setConsultores(data.map((c: any, i: number) => ({
        id: c.id, name: c.nome, whatsapp: c.telefone,
        ativos: ativosCount[c.id] || 0,
        cor: COMM_COLORS[i % COMM_COLORS.length],
      })))
    })
  }, [carregarLeads, carregarReferidos])

  const ligarAnaPtlRef = async (ref: ContatoReferido) => {
    if (!ref.telefone) return showToast('Sem telefone', false)
    setLigandoAnaPtlRef(ref.id)
    const tel = ref.telefone.replace(/\D/g, '')
    try {
      const res = await fetch('/api/admin/ana-master-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero: tel, referidor: ref.indicado_por_nome || '', contexto: 'gold' }),
      })
      if (res.ok) showToast(`ANA PTL iniciada para ${ref.nome || ref.telefone}!`)
      else showToast('Erro ao acionar ANA PTL', false)
    } catch {
      showToast('Erro de conexão', false)
    }
    setLigandoAnaPtlRef(null)
  }

  const distribuirRefConsultor = async (ref: ContatoReferido, consultor: typeof consultores[0]) => {
    setModalDistribuirRef(null)
    await supabase.from('contatos_referidos').update({ assigned_comercial_id: consultor.id }).eq('id', ref.id)
    if (notificarWppRef && consultor.whatsapp) {
      const msg = `👥 *Lead para contato — Hormone Ecosystem*\n\n📋 *Nome:* ${ref.nome || '—'}\n📱 *Telefone:* ${ref.telefone || '—'}\n👤 *Indicado por:* ${ref.indicado_por_nome || '—'}\n💼 *Profissão:* ${ref.profissao || '—'}\n\n⚡ Entre em contato agora:\nhttps://wa.me/55${(ref.telefone || '').replace(/\D/g, '')}`
      try {
        await fetch(ZAPI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
          body: JSON.stringify({ phone: consultor.whatsapp, message: msg }),
        })
      } catch {}
    }
    setDistribuidoRefIds(prev => { const n = new Set(prev); n.add(ref.id); return n })
    showToast(`Distribuído para ${consultor.name || 'consultor'}!`)
  }

  const leadsFiltrados = leads.filter(l => {
    const matchSearch = (l.nome || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.telefone || '').includes(search)
    const matchEtapa = filtroEtapa === 0 || l.etapa_agente === filtroEtapa
    const matchTemp = filtroTemp === 'todas' || l.temperatura === filtroTemp
    const matchOrigem = filtroOrigem === 'todas' || l.origem === filtroOrigem
    const matchStatus = filtroStatus === 'todos' || (l.status || 'ativo') === filtroStatus
    return matchSearch && matchEtapa && matchTemp && matchOrigem && matchStatus
  }).sort((a, b) => {
    const { coluna, direcao } = ordenacao
    let va: number, vb: number
    if (coluna === 'etapa_agente') { va = a.etapa_agente ?? 0; vb = b.etapa_agente ?? 0 }
    else if (coluna === 'total_referidos') { va = a.total_referidos ?? 0; vb = b.total_referidos ?? 0 }
    else { va = new Date(a.updated_at).getTime(); vb = new Date(b.updated_at).getTime() }
    return direcao === 'desc' ? vb - va : va - vb
  })

  const leadsFiltradosPaginados = leadsFiltrados.slice(0, paginaAtual * POR_PAGINA)

  const atualizarStatus = async (id: string, status: StatusLead) => {
    await supabase.from('leads').update({ status }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  const excluirLead = async (id: string) => {
    if (!confirm('Excluir este lead permanentemente?')) return
    await supabase.from('leads').delete().eq('id', id)
    setLeads(prev => prev.filter(l => l.id !== id))
  }

  const leadsAmeaca = leads.filter(l => l.status === 'ameaca').length
  const leadsBloqueados = leads.filter(l => l.status === 'opt_out').length
  const leadsPausados = leads.filter(l => l.status === 'pausado').length

  const referidosFiltrados = contatos.filter(r => {
    const matchSearch = (r.nome || '').toLowerCase().includes(search.toLowerCase()) ||
      (r.telefone || '').includes(search)
    const matchStatus = filtroStatusRef === 'todos' || r.status === filtroStatusRef
    return matchSearch && matchStatus
  })

  const atualizarEtapa = async (id: string, etapa: number) => {
    await supabase.from('leads').update({ etapa_agente: etapa, updated_at: new Date().toISOString() }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, etapa_agente: etapa } : l))
  }

  const atualizarTemperatura = async (id: string, temperatura: Temperatura) => {
    await supabase.from('leads').update({ temperatura, updated_at: new Date().toISOString() }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, temperatura } : l))
  }

  const atualizarStatusReferido = async (id: string, status: string) => {
    await supabase.from('contatos_referidos').update({ status }).eq('id', id)
    setContatos(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const criarLead = async () => {
    if (!novoLead.nome && !novoLead.telefone) return
    setSalvando(true)
    const { error } = await supabase.from('leads').insert({
      nome: novoLead.nome,
      telefone: novoLead.telefone,
      etapa_agente: novoLead.etapa_agente,
      temperatura: novoLead.temperatura,
    })
    if (!error) {
      setShowNovoLead(false)
      setNovoLead({ nome: '', telefone: '', etapa_agente: 1, temperatura: 'frio' })
      carregarLeads()
    }
    setSalvando(false)
  }

  // Métricas funil
  const funil = [1,2,3,4,5,6,7,8].map(n => ({
    n,
    label: etapaAgentLabels[n],
    count: leads.filter(l => l.etapa_agente === n).length,
  }))

  // Métricas referidos
  const totalReferidos = contatos.length
  const referidosVendidos = contatos.filter(r => r.status === 'vendido').length
  const referidosAguardando = contatos.filter(r => r.status === 'aguardando').length
  const referidosContatados = contatos.filter(r => r.status === 'contatado').length
  const referidosInteressados = contatos.filter(r => r.status === 'interessado').length

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="CRM — Gestão de Leads e Referidos" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Abas */}
          <div className="flex gap-2 border-b border-[#1C1C1E]">
            {([['leads', 'Leads', leads.length], ['referidos', 'Referidos', totalReferidos]] as const).map(([id, label, count]) => (
              <button
                key={id}
                onClick={() => setAba(id)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  aba === id
                    ? 'border-[#7B3FE4] text-white'
                    : 'border-transparent text-[#71717A] hover:text-white'
                }`}
              >
                {label} <span className="ml-1.5 text-xs bg-[#1C1C1E] px-1.5 py-0.5 rounded-full">{count}</span>
              </button>
            ))}
          </div>

          {aba === 'leads' && (
            <>
              {/* Funil */}
              <div className="grid grid-cols-8 gap-2">
                {funil.map((f, i) => (
                  <button
                    key={f.n}
                    onClick={() => setFiltroEtapa(f.n === filtroEtapa ? 0 : f.n)}
                    className={`rounded-xl p-3 border text-center transition-all ${
                      filtroEtapa === f.n
                        ? 'border-[#7B3FE4] bg-[#7B3FE4]/20'
                        : 'border-[#1C1C1E] bg-[#111113] hover:border-[#7B3FE4]/50'
                    }`}
                  >
                    <p className="text-2xl font-bold text-white">{f.count}</p>
                    <p className="text-[10px] text-[#71717A] mt-0.5 leading-tight">{f.label}</p>
                    {i < funil.length - 1 && f.count > 0 && funil[i + 1].count > 0 && (
                      <p className="text-[10px] text-[#3B82F6] mt-1">
                        {Math.round((funil[i + 1].count / f.count) * 100)}%
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {/* Alertas de ameaça */}
              {leadsAmeaca > 0 && (
                <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3">
                  <ShieldAlert className="w-5 h-5 text-orange-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-orange-400">{leadsAmeaca} lead{leadsAmeaca > 1 ? 's' : ''} com ameaça detectada</p>
                    <p className="text-xs text-orange-400/70">Revise imediatamente — possível risco jurídico</p>
                  </div>
                  <button onClick={() => setFiltroStatus('ameaca')} className="ml-auto text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 px-3 py-1.5 rounded-lg transition-colors">
                    Ver leads
                  </button>
                </div>
              )}

              {/* Filtro de status */}
              <div className="flex gap-2 flex-wrap">
                {([
                  ['todos',   'Todos',      leads.length,         'border-[#1C1C1E] text-[#71717A]'],
                  ['ativo',   '🟢 Ativos',   leads.filter(l => !l.status || l.status === 'ativo').length, 'border-emerald-500/30 text-emerald-400'],
                  ['pausado', '⏸ Pausados',  leadsPausados,        'border-yellow-500/30 text-yellow-400'],
                  ['opt_out', '🚫 Bloqueados', leadsBloqueados,    'border-red-500/30 text-red-400'],
                  ['ameaca',  '⚠️ Ameaça',   leadsAmeaca,          'border-orange-500/30 text-orange-400'],
                ] as const).map(([val, label, count, color]) => (
                  <button
                    key={val}
                    onClick={() => setFiltroStatus(val as StatusLead | 'todos')}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                      filtroStatus === val ? `${color} bg-[#18181A]` : 'border-[#1C1C1E] text-[#71717A] hover:border-[#3F3F46]'
                    }`}
                  >
                    {label} <span className="ml-1 opacity-60">{count}</span>
                  </button>
                ))}
              </div>

              {/* Filtros */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nome ou telefone..."
                    className="w-full bg-[#111113] border border-[#1C1C1E] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#7B3FE4]"
                  />
                </div>
                <select
                  value={filtroTemp}
                  onChange={e => setFiltroTemp(e.target.value as Temperatura | 'todas')}
                  className="bg-[#111113] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]"
                >
                  <option value="todas">🌡️ Temperatura</option>
                  <option value="quente">🔥 Quente</option>
                  <option value="morno">🟡 Morno</option>
                  <option value="frio">❄️ Frio</option>
                </select>
                <select
                  value={filtroOrigem}
                  onChange={e => setFiltroOrigem(e.target.value)}
                  className="bg-[#111113] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]"
                >
                  <option value="todas">📌 Origem</option>
                  <option value="instagram">📸 Instagram</option>
                  <option value="referido">🔗 Referido</option>
                  <option value="landing_page">🌐 Site</option>
                  <option value="google">🔍 Google</option>
                  <option value="whatsapp">💬 WhatsApp</option>
                  <option value="organico">🌿 Orgânico</option>
                  <option value="manual">✍️ Manual</option>
                </select>
                <button onClick={carregarLeads} className="p-2.5 bg-[#111113] border border-[#1C1C1E] rounded-xl text-[#71717A] hover:text-white hover:border-[#7B3FE4] transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={() => setShowNovoLead(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#7B3FE4] hover:bg-[#6B2FD4] rounded-xl text-sm font-medium text-white transition-colors">
                  <Plus className="w-4 h-4" /> Novo Lead
                </button>
              </div>

              {/* Barra de ações em lote */}
              {selecionados.size > 0 && (
                <div className="flex items-center gap-3 bg-[#7B3FE4]/10 border border-[#7B3FE4]/30 rounded-xl px-4 py-2.5">
                  <span className="text-xs text-[#A78BFA] font-medium">{selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <button
                      onClick={enviarMensagemLote}
                      disabled={enviandoMsgLote}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-[#7B3FE4]/20 hover:bg-[#7B3FE4]/30 text-[#A78BFA] border border-[#7B3FE4]/40 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {enviandoMsgLote ? 'Enviando...' : `Mensagem (${selecionados.size})`}
                    </button>
                    <button
                      onClick={iniciarVozLote}
                      disabled={ligandoVozLote}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      {ligandoVozLote && vozLoteProgresso ? `Ligando... ${vozLoteProgresso.atual}/${vozLoteProgresso.total}` : `Ligar Voz (${selecionados.size})`}
                    </button>
                    <button
                      onClick={pausarLote}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg transition-colors"
                    >
                      <PauseCircle className="w-3.5 h-3.5" /> Pausar selecionados
                    </button>
                    <button
                      onClick={exportarCSV}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Exportar CSV
                    </button>
                  </div>
                  <button onClick={() => setSelecionados(new Set())} className="text-xs text-[#71717A] hover:text-white">Limpar seleção</button>
                </div>
              )}

              {/* Tabela leads */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1C1C1E]">
                  <h2 className="text-sm font-semibold text-white">{leadsFiltrados.length} leads {leadsFiltrados.length > POR_PAGINA && <span className="text-[#71717A] font-normal">— mostrando {Math.min(paginaAtual * POR_PAGINA, leadsFiltrados.length)}</span>}</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#71717A]">{leads.filter(l => (l.etapa_agente ?? 0) >= 7).length} ganhos</span>
                    <button onClick={exportarCSV} className="flex items-center gap-1.5 text-xs text-[#71717A] hover:text-white transition-colors">
                      <Download className="w-3.5 h-3.5" /> Exportar
                    </button>
                  </div>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : leadsFiltrados.length === 0 ? (
                  <div className="text-center py-16 text-[#71717A]">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum lead encontrado</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1C1C1E]">
                          <th className="px-4 py-3 w-8">
                            <input type="checkbox"
                              checked={leadsFiltradosPaginados.length > 0 && leadsFiltradosPaginados.every(l => selecionados.has(l.id))}
                              onChange={toggleTodos}
                              className="w-3.5 h-3.5 accent-[#7B3FE4] cursor-pointer"
                            />
                          </th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-6 py-3">Lead</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Status</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3 cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleOrdenacao('etapa_agente')}>
                            <span className="flex items-center gap-1">Etapa {ordenacao.coluna === 'etapa_agente' ? (ordenacao.direcao === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}</span>
                          </th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Temp.</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Origem</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3 cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleOrdenacao('total_referidos')}>
                            <span className="flex items-center gap-1">Referidos {ordenacao.coluna === 'total_referidos' ? (ordenacao.direcao === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}</span>
                          </th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Dor Principal</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3 cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleOrdenacao('updated_at')}>
                            <span className="flex items-center gap-1">Atualizado {ordenacao.coluna === 'updated_at' ? (ordenacao.direcao === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}</span>
                          </th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leadsFiltradosPaginados.map(lead => (
                          <tr key={lead.id} className={`border-b border-[#1C1C1E] hover:bg-[#18181A] transition-colors ${selecionados.has(lead.id) ? 'bg-[#7B3FE4]/5' : ''}`}>
                            <td className="px-4 py-4 w-8">
                              <input type="checkbox"
                                checked={selecionados.has(lead.id)}
                                onChange={() => toggleSelecionado(lead.id)}
                                className="w-3.5 h-3.5 accent-[#7B3FE4] cursor-pointer"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-white">{lead.nome || '—'}</p>
                              {lead.telefone && (
                                <p className="text-xs text-[#71717A]">{lead.telefone}</p>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1.5">
                                <StatusBadge status={lead.status} />
                                {lead.atendimento_humano && (
                                  <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border font-medium bg-blue-500/15 text-blue-400 border-blue-500/30">
                                    👤 Humano ativo
                                  </span>
                                )}
                                {(lead.status === 'opt_out' || lead.status === 'pausado' || lead.status === 'ameaca') && (
                                  <button
                                    onClick={() => atualizarStatus(lead.id, 'ativo')}
                                    className="inline-flex items-center gap-1 text-[10px] text-[#71717A] hover:text-emerald-400 transition-colors"
                                    title="Reativar lead"
                                  >
                                    <RotateCcw className="w-3 h-3" /> Reativar
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <select
                                value={lead.etapa_agente ?? ''}
                                onChange={e => atualizarEtapa(lead.id, Number(e.target.value))}
                                className={`text-xs px-2 py-1 rounded-lg border bg-transparent cursor-pointer focus:outline-none ${lead.etapa_agente ? etapaAgentColors[lead.etapa_agente] : 'text-[#71717A] border-[#1C1C1E]'}`}
                              >
                                {[1,2,3,4,5,6,7,8].map(n => (
                                  <option key={n} value={n} className="bg-[#111113] text-white">{etapaAgentLabels[n]}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-4">
                              <select
                                value={lead.temperatura}
                                onChange={e => atualizarTemperatura(lead.id, e.target.value as Temperatura)}
                                className="bg-transparent text-xs focus:outline-none cursor-pointer"
                              >
                                <option value="quente" className="bg-[#111113]">🔥 Quente</option>
                                <option value="morno" className="bg-[#111113]">🟡 Morno</option>
                                <option value="frio" className="bg-[#111113]">❄️ Frio</option>
                              </select>
                            </td>
                            <td className="px-4 py-4">
                              <OrigemBadge origem={lead.origem} />
                            </td>
                            <td className="px-4 py-4">
                              {(lead.total_referidos ?? 0) > 0 ? (
                                <div className="flex items-center gap-1">
                                  <Share2 className="w-3 h-3 text-indigo-400" />
                                  <span className="text-xs text-white">{lead.total_referidos}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-[#71717A]">—</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-xs text-[#71717A] max-w-[200px] truncate">
                              {lead.dor_principal || '—'}
                            </td>
                            <td className="px-4 py-4 text-xs text-[#71717A]">
                              {tempoRelativo(lead.updated_at)}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => { setLeadSelecionado(lead); setShowModal(true) }}
                                  className="p-1.5 text-[#71717A] hover:text-white hover:bg-[#1C1C1E] rounded-lg transition-colors"
                                  title="Ver detalhes"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {lead.telefone && (
                                  <button
                                    onClick={() => acionarAna(lead)}
                                    disabled={acionandoAna === lead.id}
                                    className="p-1.5 text-[#71717A] hover:text-[#A78BFA] hover:bg-[#1C1C1E] rounded-lg transition-colors disabled:opacity-50"
                                    title="Acionar Ana (WhatsApp)"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                  </button>
                                )}
                                {lead.telefone && (
                                  <a
                                    href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 text-[#71717A] hover:text-green-400 hover:bg-[#1C1C1E] rounded-lg transition-colors"
                                    title="Abrir WhatsApp"
                                  >
                                    <Phone className="w-4 h-4" />
                                  </a>
                                )}
                                {lead.telefone && (
                                  <button
                                    onClick={() => ligarVoz(lead.telefone!, lead.id)}
                                    disabled={ligandoVoz === lead.id}
                                    className="p-1.5 text-[#71717A] hover:text-green-400 hover:bg-[#1C1C1E] rounded-lg transition-colors disabled:opacity-50"
                                    title="Ligar via Ana Voz"
                                  >
                                    <PhoneCall className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => copiarLinkIndicacao(lead.id)}
                                  className="p-1.5 text-[#71717A] hover:text-[#A78BFA] hover:bg-[#1C1C1E] rounded-lg transition-colors"
                                  title="Copiar link de indicação"
                                >
                                  {copiandoLink === lead.id
                                    ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                                    : <Link className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    setMenuPos({ x: rect.right, y: rect.bottom + 4 })
                                    setMenuAberto(menuAberto === lead.id ? null : lead.id)
                                  }}
                                  className="p-1.5 text-[#71717A] hover:text-white hover:bg-[#1C1C1E] rounded-lg transition-colors"
                                  title="Mais ações"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Carregar mais */}
              {leadsFiltrados.length > paginaAtual * POR_PAGINA && (
                <div className="flex justify-center">
                  <button
                    onClick={() => setPaginaAtual(p => p + 1)}
                    className="text-sm text-[#71717A] hover:text-white border border-[#1C1C1E] hover:border-[#7B3FE4] px-6 py-2.5 rounded-xl transition-all"
                  >
                    Carregar mais ({leadsFiltrados.length - paginaAtual * POR_PAGINA} restantes)
                  </button>
                </div>
              )}
            </>
          )}

          {aba === 'referidos' && (
            <>
              {/* Métricas referidos */}
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: 'Total Referidos', value: totalReferidos, icon: <Users className="w-5 h-5" />, color: 'text-indigo-400' },
                  { label: 'Aguardando', value: referidosAguardando, icon: <Share2 className="w-5 h-5" />, color: 'text-yellow-400' },
                  { label: 'Contatados', value: referidosContatados, icon: <MessageSquare className="w-5 h-5" />, color: 'text-blue-400' },
                  { label: 'Interessados', value: referidosInteressados, icon: <Share2 className="w-5 h-5" />, color: 'text-orange-400' },
                  { label: 'Vendidos', value: referidosVendidos, icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-400' },
                ].map(m => (
                  <div key={m.label} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                    <div className={`mb-2 ${m.color}`}>{m.icon}</div>
                    <p className="text-2xl font-bold text-white">{m.value}</p>
                    <p className="text-xs text-[#71717A] mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Filtros referidos */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nome ou telefone..."
                    className="w-full bg-[#111113] border border-[#1C1C1E] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#7B3FE4]"
                  />
                </div>
                <select
                  value={filtroStatusRef}
                  onChange={e => setFiltroStatusRef(e.target.value)}
                  className="bg-[#111113] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]"
                >
                  <option value="todos">Todos status</option>
                  <option value="aguardando">Aguardando</option>
                  <option value="contatado">Contatado</option>
                  <option value="interessado">Interessado</option>
                  <option value="vendido">Vendido</option>
                </select>
                <button onClick={carregarReferidos} className="p-2.5 bg-[#111113] border border-[#1C1C1E] rounded-xl text-[#71717A] hover:text-white hover:border-[#7B3FE4] transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Tabela referidos */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#1C1C1E]">
                  <h2 className="text-sm font-semibold text-white">{referidosFiltrados.length} referidos</h2>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-6 h-6 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : referidosFiltrados.length === 0 ? (
                  <div className="text-center py-16 text-[#71717A]">
                    <Share2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Nenhum referido ainda</p>
                    <p className="text-xs mt-1">Os referidos aparecerão aqui quando o agente coletar</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[#1C1C1E]">
                          <th className="text-left text-xs text-[#71717A] font-medium px-6 py-3">Nome</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Telefone</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Profissão</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Hobby</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Score</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Indicado por</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Status</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referidosFiltrados.map(ref => {
                          const score = calcScore(ref.profissao, ref.hobby)
                          return (
                            <tr key={ref.id} className="border-b border-[#1C1C1E] hover:bg-[#18181A] transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-white">{ref.nome || '—'}</td>
                              <td className="px-4 py-4 text-xs text-[#71717A]">{ref.telefone || '—'}</td>
                              <td className="px-4 py-4 text-xs text-[#A1A1AA]">{ref.profissao || '—'}</td>
                              <td className="px-4 py-4 text-xs text-[#A1A1AA]">{ref.hobby || '—'}</td>
                              <td className="px-4 py-4">
                                <span className="text-[#F59E0B] font-mono text-xs tracking-tight">{scoreCircles(score)}</span>
                              </td>
                              <td className="px-4 py-4 text-xs text-[#71717A]">
                                {ref.indicado_por_nome || ref.indicado_por_telefone || '—'}
                              </td>
                              <td className="px-4 py-4">
                                <select
                                  value={ref.status}
                                  onChange={e => atualizarStatusReferido(ref.id, e.target.value)}
                                  className={`text-xs px-2 py-1 rounded-lg bg-transparent cursor-pointer focus:outline-none ${statusContatoColors[ref.status] ?? 'bg-zinc-500/20 text-zinc-400'}`}
                                >
                                  {['aguardando', 'contatado', 'interessado', 'vendido'].map(s => (
                                    <option key={s} value={s} className="bg-[#111113] text-white capitalize">{s}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-1">
                                  {ref.telefone && (
                                    <button
                                      onClick={() => ligarAnaPtlRef(ref)}
                                      disabled={ligandoAnaPtlRef === ref.id}
                                      className="flex items-center gap-1 text-xs px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-lg transition-colors disabled:opacity-50"
                                      title="ANA PTL — ligação automatizada"
                                    >
                                      <PhoneCall className="w-3 h-3" />
                                      {ligandoAnaPtlRef === ref.id ? 'Ligando…' : 'ANA ▶'}
                                    </button>
                                  )}
                                  {ref.telefone && (
                                    <button
                                      onClick={() => ligarVoz(ref.telefone!, ref.id)}
                                      disabled={ligandoVoz === ref.id}
                                      className="p-1.5 text-[#71717A] hover:text-green-400 hover:bg-[#1C1C1E] rounded-lg transition-colors disabled:opacity-50"
                                      title="Ligar via VAPI"
                                    >
                                      <PhoneCall className="w-4 h-4" />
                                    </button>
                                  )}
                                  {ref.telefone && (
                                    <a
                                      href={`https://wa.me/55${ref.telefone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 text-[#71717A] hover:text-green-400 hover:bg-[#1C1C1E] rounded-lg transition-colors inline-flex"
                                      title="Abrir WhatsApp"
                                    >
                                      <Phone className="w-4 h-4" />
                                    </a>
                                  )}
                                  <button
                                    onClick={() => { setConsultorSelecionadoRef(''); setNotificarWppRef(true); setModalDistribuirRef(ref) }}
                                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
                                      distribuidoRefIds.has(ref.id)
                                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                        : 'bg-[#7B3FE4]/20 hover:bg-[#7B3FE4]/30 text-[#A78BFA] border-[#7B3FE4]/30'
                                    }`}
                                    title="Distribuir para consultor"
                                  >
                                    {distribuidoRefIds.has(ref.id) ? '✓' : 'Distribuir'}
                                  </button>
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
            </>
          )}
        </main>
      </div>

      {/* Overlay para fechar menu */}
      {menuAberto && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuAberto(null)} />
      )}

      {/* Menu flutuante global */}
      {menuAberto && (() => {
        const lead = leads.find(l => l.id === menuAberto)
        if (!lead) return null
        return (
          <div
            className="fixed z-50 w-52 bg-[#111113] border border-[#2C2C2E] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
            style={{ left: Math.min(menuPos.x - 208, window.innerWidth - 220), top: menuPos.y }}
          >
            {/* Header do menu */}
            <div className="px-4 py-3 border-b border-[#1C1C1E]">
              <p className="text-xs font-semibold text-white truncate">{lead.nome || 'Lead'}</p>
              <p className="text-[10px] text-[#52525B] truncate">{lead.telefone}</p>
            </div>

            {/* Ações de status */}
            <div className="py-1.5">
              {lead.status !== 'pausado' && (
                <button onClick={() => { atualizarStatus(lead.id, 'pausado'); setMenuAberto(null) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#D4B896] hover:bg-[#1C1C1E] transition-colors">
                  <PauseCircle className="w-4 h-4 opacity-70" /> Pausar lead
                </button>
              )}
              {lead.status !== 'opt_out' && (
                <button onClick={() => { atualizarStatus(lead.id, 'opt_out'); setMenuAberto(null) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#F87171] hover:bg-[#1C1C1E] transition-colors">
                  <Ban className="w-4 h-4 opacity-70" /> Bloquear
                </button>
              )}
              {lead.status !== 'ameaca' && (
                <button onClick={() => { atualizarStatus(lead.id, 'ameaca'); setMenuAberto(null) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#FB923C] hover:bg-[#1C1C1E] transition-colors">
                  <ShieldAlert className="w-4 h-4 opacity-70" /> Marcar ameaça
                </button>
              )}
              {lead.status !== 'ativo' && (
                <button onClick={() => { atualizarStatus(lead.id, 'ativo'); setMenuAberto(null) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#34D399] hover:bg-[#1C1C1E] transition-colors">
                  <RotateCcw className="w-4 h-4 opacity-70" /> Reativar
                </button>
              )}
            </div>

            {/* Jurídico */}
            <div className="border-t border-[#1C1C1E] py-1.5">
              <div className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#3F3F46] cursor-not-allowed">
                <Scale className="w-4 h-4 opacity-50" />
                <span>Jurídico</span>
                <span className="ml-auto text-[10px] bg-[#1C1C1E] text-[#52525B] px-2 py-0.5 rounded-full font-medium">Em breve</span>
              </div>
            </div>

            {/* Excluir */}
            <div className="border-t border-[#1C1C1E] py-1.5">
              <button onClick={() => { excluirLead(lead.id); setMenuAberto(null) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[#1C1C1E] transition-colors">
                <Trash2 className="w-4 h-4 opacity-70" /> Excluir lead
              </button>
            </div>
          </div>
        )
      })()}

      {/* Modal detalhe lead */}
      {showModal && leadSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{leadSelecionado.nome || '—'}</h3>
              <button onClick={() => setShowModal(false)} className="text-[#71717A] hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['Telefone', leadSelecionado.telefone || '—'],
                ['Total Referidos', String(leadSelecionado.total_referidos ?? 0)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[#71717A]">{k}</span>
                  <span className="text-white">{v}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-[#71717A]">Etapa</span>
                {leadSelecionado.etapa_agente ? (
                  <span className={`px-2 py-0.5 rounded-lg text-xs border ${etapaAgentColors[leadSelecionado.etapa_agente]}`}>
                    {etapaAgentLabels[leadSelecionado.etapa_agente]}
                  </span>
                ) : <span className="text-[#71717A]">—</span>}
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717A]">Temperatura</span>
                <div className="flex items-center gap-1">
                  <TemperaturaIcon t={leadSelecionado.temperatura} />
                  <span className="text-white capitalize">{leadSelecionado.temperatura}</span>
                </div>
              </div>
              {leadSelecionado.dor_principal && (
                <div>
                  <span className="text-[#71717A]">Dor Principal</span>
                  <p className="mt-1 text-white bg-[#18181A] rounded-lg p-3 text-xs">{leadSelecionado.dor_principal}</p>
                </div>
              )}
              <div className="flex justify-between text-xs text-[#71717A]">
                <span>Atualizado</span>
                <span>{tempoRelativo(leadSelecionado.updated_at)}</span>
              </div>
            </div>

            {/* Histórico de conversa */}
            {leadSelecionado.historico && leadSelecionado.historico.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#71717A] mb-2">Histórico com Ana Mensagem</p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {leadSelecionado.historico.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${
                        msg.role === 'assistant'
                          ? 'bg-[#7B3FE4]/20 text-[#C4B5FD] rounded-tl-none'
                          : 'bg-[#1C1C1E] text-white rounded-tr-none'
                      }`}>
                        {msg.content}
                        {msg.ts && <p className="text-[10px] opacity-50 mt-1">{tempoRelativo(msg.ts)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {leadSelecionado.telefone && (
                <button
                  onClick={() => { acionarAna(leadSelecionado); setShowModal(false) }}
                  className="flex items-center justify-center gap-2 flex-1 bg-[#7B3FE4]/20 hover:bg-[#7B3FE4]/30 border border-[#7B3FE4]/40 text-[#A78BFA] py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  <MessageSquare className="w-4 h-4" /> Acionar Ana
                </button>
              )}
              {leadSelecionado.telefone && (
                <a
                  href={`https://wa.me/55${leadSelecionado.telefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 flex-1 bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
                >
                  <Phone className="w-4 h-4" /> Abrir WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal novo lead */}
      {showNovoLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Novo Lead</h3>
              <button onClick={() => setShowNovoLead(false)} className="text-[#71717A] hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Nome', key: 'nome', type: 'text' },
                { label: 'Telefone *', key: 'telefone', type: 'tel' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-[#71717A] mb-1 block">{f.label}</label>
                  <input
                    type={f.type}
                    value={novoLead[f.key as keyof typeof novoLead] as string}
                    onChange={e => setNovoLead(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#71717A] mb-1 block">Etapa</label>
                  <select value={novoLead.etapa_agente} onChange={e => setNovoLead(prev => ({ ...prev, etapa_agente: Number(e.target.value) }))}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]">
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{etapaAgentLabels[n]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#71717A] mb-1 block">Temperatura</label>
                  <select value={novoLead.temperatura} onChange={e => setNovoLead(prev => ({ ...prev, temperatura: e.target.value as Temperatura }))}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]">
                    <option value="quente">🔥 Quente</option>
                    <option value="morno">🟡 Morno</option>
                    <option value="frio">❄️ Frio</option>
                  </select>
                </div>
              </div>
            </div>
            <button onClick={criarLead} disabled={salvando || (!novoLead.nome && !novoLead.telefone)}
              className="w-full bg-[#7B3FE4] hover:bg-[#6B2FD4] disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
              {salvando ? 'Salvando...' : 'Criar Lead'}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className={`fixed top-5 right-5 z-[60] px-4 py-3 rounded-xl text-sm font-medium shadow-lg border transition-all ${toastMsg.ok ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
          {toastMsg.msg}
        </div>
      )}

      {/* Modal Distribuir referido */}
      {modalDistribuirRef && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Distribuir para Consultor</h3>
                <p className="text-xs text-[#71717A] mt-0.5">{modalDistribuirRef.nome || modalDistribuirRef.telefone}</p>
              </div>
              <button onClick={() => setModalDistribuirRef(null)} className="text-[#71717A] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#18181A] rounded-xl p-3 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-[#71717A]">Telefone</span><span className="text-white font-mono">{modalDistribuirRef.telefone || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#71717A]">Indicado por</span><span className="text-white">{modalDistribuirRef.indicado_por_nome || '—'}</span></div>
              <div className="flex justify-between"><span className="text-[#71717A]">Profissão</span><span className="text-white">{modalDistribuirRef.profissao || '—'}</span></div>
            </div>

            {consultores.length === 0 ? (
              <p className="text-xs text-[#52525B] text-center py-4">Nenhum consultor disponível cadastrado</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {consultores.map(c => (
                  <button
                    key={c.id}
                    onClick={() => distribuirRefConsultor(modalDistribuirRef, c)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[#1C1C1E] bg-[#18181A] hover:border-[#7B3FE4]/50 hover:bg-[#7B3FE4]/5 transition-all"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: c.cor }}>
                      {(c.name || '?').split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || '?'}
                    </div>
                    <p className="text-xs font-medium text-white truncate max-w-full">{(c.name || '?').split(' ')[0]}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#71717A]">{c.ativos} ativos</span>
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: c.ativos >= 10 ? '#EF4444' : '#10B981' }} />
                    </div>
                  </button>
                ))}
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input type="checkbox" checked={notificarWppRef} onChange={e => setNotificarWppRef(e.target.checked)} className="accent-[#7B3FE4]" />
              <span className="text-xs text-[#A1A1AA]">Notificar consultor via WhatsApp</span>
            </label>
          </div>
        </div>
      )}

      {confirmarVozLote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <PhoneCall className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Confirmar ligações via Ana Voz</h3>
                <p className="text-xs text-[#71717A] mt-0.5">Ana Voz vai ligar para {confirmarVozLote.alvos.length} lead{confirmarVozLote.alvos.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 mb-4">
              {confirmarVozLote.alvos.map(lead => (
                <div key={lead.id} className="flex items-center justify-between bg-[#18181A] rounded-lg px-3 py-2">
                  <span className="text-xs text-white">{lead.nome || '—'}</span>
                  <span className="text-xs text-[#71717A] font-mono">{lead.telefone}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 mb-4">
              Isso vai consumir créditos VAPI. Certifique-se que os leads estão prontos para contato.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmarVozLote(null)}
                className="flex-1 text-xs px-4 py-2.5 bg-[#1C1C1E] hover:bg-[#232325] text-[#A1A1AA] rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={ligarVozLote}
                className="flex-1 text-xs px-4 py-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30 rounded-xl transition-colors font-medium">
                Confirmar e ligar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
