'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import {
  MessageSquare, Phone, Search, RefreshCw,
  Flame, Minus, Snowflake, X, Plus, Eye,
  Users, CheckCircle, PhoneCall, Share2
} from 'lucide-react'

type Etapa = 'instagram' | 'site' | 'whatsapp' | 'apresentacao' | 'conexao' | 'di' | 'speech' | 'fechamento' | 'referidos' | 'validacao' | 'ganho' | 'perdido'
type Temperatura = 'quente' | 'morno' | 'frio'
type StatusReferido = 'pendente' | 'mensagem_enviada' | 'respondeu' | 'conversa_iniciada' | 'validado' | 'invalido'

interface Lead {
  id: string
  nome: string
  email: string
  telefone: string | null
  whatsapp: string | null
  origem: string
  etapa: Etapa
  temperatura: Temperatura
  ultimo_contato: string | null
  notas: string | null
  created_at: string
}

interface Referido {
  id: string
  lead_origem_id: string
  nome: string | null
  telefone: string
  tipo: 'normal' | 'nao_fechou'
  status: StatusReferido
  mensagem_enviada_em: string | null
  conversa_iniciada_em: string | null
  validado_em: string | null
  notas: string | null
  created_at: string
}

const etapaLabels: Record<Etapa, string> = {
  instagram: 'Instagram',
  site: 'Site',
  whatsapp: 'WhatsApp',
  apresentacao: 'Apresentação',
  conexao: 'Conexão',
  di: 'D.I.',
  speech: 'Speech',
  fechamento: 'Fechamento',
  referidos: 'Referidos',
  validacao: 'Validação',
  ganho: 'Ganho',
  perdido: 'Perdido',
}

const etapaColors: Record<Etapa, string> = {
  instagram: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  site: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  whatsapp: 'bg-green-500/20 text-green-400 border-green-500/30',
  apresentacao: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  conexao: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  di: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  speech: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  fechamento: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  referidos: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  validacao: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  ganho: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  perdido: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const statusReferidoLabels: Record<StatusReferido, string> = {
  pendente: 'Pendente',
  mensagem_enviada: 'Msg Enviada',
  respondeu: 'Respondeu',
  conversa_iniciada: 'Conversa',
  validado: 'Validado',
  invalido: 'Inválido',
}

const statusReferidoColors: Record<StatusReferido, string> = {
  pendente: 'bg-zinc-500/20 text-zinc-400',
  mensagem_enviada: 'bg-blue-500/20 text-blue-400',
  respondeu: 'bg-yellow-500/20 text-yellow-400',
  conversa_iniciada: 'bg-purple-500/20 text-purple-400',
  validado: 'bg-emerald-500/20 text-emerald-400',
  invalido: 'bg-red-500/20 text-red-400',
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
  const [referidos, setReferidos] = useState<Referido[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState<Etapa | 'todas'>('todas')
  const [filtroTemp, setFiltroTemp] = useState<Temperatura | 'todas'>('todas')
  const [showModal, setShowModal] = useState(false)
  const [leadSelecionado, setLeadSelecionado] = useState<Lead | null>(null)
  const [showNovoLead, setShowNovoLead] = useState(false)
  const [showNovoReferido, setShowNovoReferido] = useState(false)
  const [novoLead, setNovoLead] = useState({ nome: '', email: '', telefone: '', whatsapp: '', origem: 'manual', etapa: 'site' as Etapa, temperatura: 'frio' as Temperatura })
  const [novoReferido, setNovoReferido] = useState({ lead_origem_id: '', nome: '', telefone: '', tipo: 'normal' as 'normal' | 'nao_fechou' })
  const [salvando, setSalvando] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const carregarLeads = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false })
    if (data) setLeads(data as Lead[])
    setLoading(false)
  }, [supabase])

  const carregarReferidos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('referidos').select('*').order('created_at', { ascending: false })
    if (data) setReferidos(data as Referido[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    carregarLeads()
    carregarReferidos()
  }, [carregarLeads, carregarReferidos])

  const leadsFiltrados = leads.filter(l => {
    const matchSearch = l.nome.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase()) ||
      (l.telefone || '').includes(search)
    const matchEtapa = filtroEtapa === 'todas' || l.etapa === filtroEtapa
    const matchTemp = filtroTemp === 'todas' || l.temperatura === filtroTemp
    return matchSearch && matchEtapa && matchTemp
  })

  const referidosFiltrados = referidos.filter(r =>
    (r.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    r.telefone.includes(search)
  )

  const atualizarEtapa = async (id: string, etapa: Etapa) => {
    await supabase.from('leads').update({ etapa, updated_at: new Date().toISOString() }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, etapa } : l))
  }

  const atualizarTemperatura = async (id: string, temperatura: Temperatura) => {
    await supabase.from('leads').update({ temperatura, updated_at: new Date().toISOString() }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, temperatura } : l))
  }

  const atualizarStatusReferido = async (id: string, status: StatusReferido) => {
    const update: Record<string, string> = { status }
    if (status === 'mensagem_enviada') update.mensagem_enviada_em = new Date().toISOString()
    if (status === 'conversa_iniciada') update.conversa_iniciada_em = new Date().toISOString()
    if (status === 'validado') update.validado_em = new Date().toISOString()
    await supabase.from('referidos').update(update).eq('id', id)
    setReferidos(prev => prev.map(r => r.id === id ? { ...r, status, ...update } : r))
  }

  const criarLead = async () => {
    if (!novoLead.nome || !novoLead.email) return
    setSalvando(true)
    const { error } = await supabase.from('leads').insert({ ...novoLead, ultimo_contato: new Date().toISOString() })
    if (!error) {
      setShowNovoLead(false)
      setNovoLead({ nome: '', email: '', telefone: '', whatsapp: '', origem: 'manual', etapa: 'site', temperatura: 'frio' })
      carregarLeads()
    }
    setSalvando(false)
  }

  const criarReferido = async () => {
    if (!novoReferido.telefone || !novoReferido.lead_origem_id) return
    setSalvando(true)
    const { error } = await supabase.from('referidos').insert(novoReferido)
    if (!error) {
      setShowNovoReferido(false)
      setNovoReferido({ lead_origem_id: '', nome: '', telefone: '', tipo: 'normal' })
      carregarReferidos()
    }
    setSalvando(false)
  }

  // Métricas funil (só etapas do agente)
  const etapasFunil: Etapa[] = ['whatsapp', 'apresentacao', 'conexao', 'di', 'speech', 'fechamento', 'referidos', 'validacao', 'ganho']
  const funil = etapasFunil.map(etapa => ({
    etapa,
    label: etapaLabels[etapa],
    count: leads.filter(l => l.etapa === etapa).length,
  }))

  // Métricas referidos
  const totalReferidos = referidos.length
  const referidosNormal = referidos.filter(r => r.tipo === 'normal').length
  const referidosNaoFechou = referidos.filter(r => r.tipo === 'nao_fechou').length
  const referidosValidados = referidos.filter(r => r.status === 'validado').length
  const conversasIniciadas = referidos.filter(r => r.status === 'conversa_iniciada' || r.status === 'validado').length
  const mensagensEnviadas = referidos.filter(r => r.status !== 'pendente').length

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
              <div className="grid grid-cols-9 gap-2">
                {funil.map((f, i) => (
                  <button
                    key={f.etapa}
                    onClick={() => setFiltroEtapa(f.etapa === filtroEtapa ? 'todas' : f.etapa)}
                    className={`rounded-xl p-3 border text-center transition-all ${
                      filtroEtapa === f.etapa
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

              {/* Filtros */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nome, email ou telefone..."
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
                <button onClick={carregarLeads} className="p-2.5 bg-[#111113] border border-[#1C1C1E] rounded-xl text-[#71717A] hover:text-white hover:border-[#7B3FE4] transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={() => setShowNovoLead(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#7B3FE4] hover:bg-[#6B2FD4] rounded-xl text-sm font-medium text-white transition-colors">
                  <Plus className="w-4 h-4" /> Novo Lead
                </button>
              </div>

              {/* Tabela leads */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1C1C1E]">
                  <h2 className="text-sm font-semibold text-white">{leadsFiltrados.length} leads</h2>
                  <span className="text-xs text-[#71717A]">{leads.filter(l => l.etapa === 'ganho').length} ganhos · {leads.filter(l => l.etapa === 'perdido').length} perdidos</span>
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
                          <th className="text-left text-xs text-[#71717A] font-medium px-6 py-3">Lead</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Etapa</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Temp.</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Referidos</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Último contato</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leadsFiltrados.map(lead => {
                          const refs = referidos.filter(r => r.lead_origem_id === lead.id)
                          const refsValidados = refs.filter(r => r.status === 'validado').length
                          return (
                            <tr key={lead.id} className="border-b border-[#1C1C1E] hover:bg-[#18181A] transition-colors">
                              <td className="px-6 py-4">
                                <p className="text-sm font-medium text-white">{lead.nome}</p>
                                <p className="text-xs text-[#71717A]">{lead.email}</p>
                                {(lead.whatsapp || lead.telefone) && (
                                  <p className="text-xs text-[#71717A]">{lead.whatsapp || lead.telefone}</p>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <select
                                  value={lead.etapa}
                                  onChange={e => atualizarEtapa(lead.id, e.target.value as Etapa)}
                                  className={`text-xs px-2 py-1 rounded-lg border bg-transparent cursor-pointer focus:outline-none ${etapaColors[lead.etapa]}`}
                                >
                                  {(Object.keys(etapaLabels) as Etapa[]).map(e => (
                                    <option key={e} value={e} className="bg-[#111113] text-white">{etapaLabels[e]}</option>
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
                                {refs.length > 0 ? (
                                  <div className="flex items-center gap-1">
                                    <Share2 className="w-3 h-3 text-indigo-400" />
                                    <span className="text-xs text-white">{refs.length}</span>
                                    <span className="text-xs text-[#71717A]">/ {refsValidados} válidos</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-[#71717A]">—</span>
                                )}
                              </td>
                              <td className="px-4 py-4 text-xs text-[#71717A]">
                                {tempoRelativo(lead.ultimo_contato || lead.created_at)}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => { setLeadSelecionado(lead); setShowModal(true) }}
                                    className="p-1.5 text-[#71717A] hover:text-white hover:bg-[#1C1C1E] rounded-lg transition-colors"
                                    title="Ver detalhes"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {(lead.whatsapp || lead.telefone) && (
                                    <a
                                      href={`https://wa.me/55${(lead.whatsapp || lead.telefone || '').replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 text-[#71717A] hover:text-green-400 hover:bg-[#1C1C1E] rounded-lg transition-colors"
                                      title="Abrir WhatsApp"
                                    >
                                      <Phone className="w-4 h-4" />
                                    </a>
                                  )}
                                  <button
                                    onClick={() => { setNovoReferido(prev => ({ ...prev, lead_origem_id: lead.id })); setShowNovoReferido(true) }}
                                    className="p-1.5 text-[#71717A] hover:text-indigo-400 hover:bg-[#1C1C1E] rounded-lg transition-colors"
                                    title="Adicionar referido"
                                  >
                                    <Share2 className="w-4 h-4" />
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

          {aba === 'referidos' && (
            <>
              {/* Métricas referidos */}
              <div className="grid grid-cols-5 gap-4">
                {[
                  { label: 'Total Referidos', value: totalReferidos, icon: <Users className="w-5 h-5" />, color: 'text-indigo-400' },
                  { label: 'De Fechamentos', value: referidosNormal, icon: <Share2 className="w-5 h-5" />, color: 'text-emerald-400', sub: '20 por cliente' },
                  { label: 'De Não-Fechou', value: referidosNaoFechou, icon: <Share2 className="w-5 h-5" />, color: 'text-orange-400', sub: '4 por cliente' },
                  { label: 'Msgs Enviadas', value: mensagensEnviadas, icon: <MessageSquare className="w-5 h-5" />, color: 'text-blue-400' },
                  { label: 'Validados', value: referidosValidados, icon: <CheckCircle className="w-5 h-5" />, color: 'text-emerald-400' },
                ].map(m => (
                  <div key={m.label} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                    <div className={`mb-2 ${m.color}`}>{m.icon}</div>
                    <p className="text-2xl font-bold text-white">{m.value}</p>
                    <p className="text-xs text-[#71717A] mt-0.5">{m.label}</p>
                    {m.sub && <p className="text-[10px] text-[#3B82F6] mt-0.5">{m.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Filtros referidos */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nome ou telefone..."
                    className="w-full bg-[#111113] border border-[#1C1C1E] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#71717A] focus:outline-none focus:border-[#7B3FE4]"
                  />
                </div>
                <button onClick={carregarReferidos} className="p-2.5 bg-[#111113] border border-[#1C1C1E] rounded-xl text-[#71717A] hover:text-white hover:border-[#7B3FE4] transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={() => setShowNovoReferido(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[#7B3FE4] hover:bg-[#6B2FD4] rounded-xl text-sm font-medium text-white transition-colors">
                  <Plus className="w-4 h-4" /> Novo Referido
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
                          <th className="text-left text-xs text-[#71717A] font-medium px-6 py-3">Contato</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Tipo</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Status</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Msg enviada</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Conversa</th>
                          <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {referidosFiltrados.map(ref => (
                          <tr key={ref.id} className="border-b border-[#1C1C1E] hover:bg-[#18181A] transition-colors">
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-white">{ref.nome || '—'}</p>
                              <p className="text-xs text-[#71717A]">{ref.telefone}</p>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`text-xs px-2 py-1 rounded-lg ${ref.tipo === 'normal' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                {ref.tipo === 'normal' ? '20 refs' : '4 refs'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <select
                                value={ref.status}
                                onChange={e => atualizarStatusReferido(ref.id, e.target.value as StatusReferido)}
                                className={`text-xs px-2 py-1 rounded-lg bg-transparent cursor-pointer focus:outline-none ${statusReferidoColors[ref.status]}`}
                              >
                                {(Object.keys(statusReferidoLabels) as StatusReferido[]).map(s => (
                                  <option key={s} value={s} className="bg-[#111113] text-white">{statusReferidoLabels[s]}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-4 text-xs text-[#71717A]">
                              {tempoRelativo(ref.mensagem_enviada_em)}
                            </td>
                            <td className="px-4 py-4 text-xs text-[#71717A]">
                              {tempoRelativo(ref.conversa_iniciada_em)}
                            </td>
                            <td className="px-4 py-4">
                              <a
                                href={`https://wa.me/55${ref.telefone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-[#71717A] hover:text-green-400 hover:bg-[#1C1C1E] rounded-lg transition-colors inline-flex"
                                title="Abrir WhatsApp"
                              >
                                <Phone className="w-4 h-4" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Modal detalhe lead */}
      {showModal && leadSelecionado && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{leadSelecionado.nome}</h3>
              <button onClick={() => setShowModal(false)} className="text-[#71717A] hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['Email', leadSelecionado.email],
                ['Telefone', leadSelecionado.telefone || '—'],
                ['WhatsApp', leadSelecionado.whatsapp || '—'],
                ['Origem', leadSelecionado.origem],
                ['Cadastrado', new Date(leadSelecionado.created_at).toLocaleDateString('pt-BR')],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[#71717A]">{k}</span>
                  <span className="text-white">{v}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-[#71717A]">Etapa</span>
                <span className={`px-2 py-0.5 rounded-lg text-xs border ${etapaColors[leadSelecionado.etapa]}`}>{etapaLabels[leadSelecionado.etapa]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#71717A]">Temperatura</span>
                <div className="flex items-center gap-1">
                  <TemperaturaIcon t={leadSelecionado.temperatura} />
                  <span className="text-white capitalize">{leadSelecionado.temperatura}</span>
                </div>
              </div>
              {leadSelecionado.notas && (
                <div>
                  <span className="text-[#71717A]">Notas</span>
                  <p className="mt-1 text-white bg-[#18181A] rounded-lg p-3 text-xs">{leadSelecionado.notas}</p>
                </div>
              )}
              <div className="pt-2 border-t border-[#1C1C1E]">
                <span className="text-[#71717A] text-xs">Referidos</span>
                <div className="mt-1 flex items-center gap-4">
                  {(() => {
                    const refs = referidos.filter(r => r.lead_origem_id === leadSelecionado.id)
                    return <>
                      <span className="text-white text-sm">{refs.length} gerados</span>
                      <span className="text-emerald-400 text-sm">{refs.filter(r => r.status === 'validado').length} validados</span>
                      <span className="text-blue-400 text-sm">{refs.filter(r => ['conversa_iniciada', 'validado'].includes(r.status)).length} conversas</span>
                    </>
                  })()}
                </div>
              </div>
            </div>
            {(leadSelecionado.whatsapp || leadSelecionado.telefone) && (
              <a
                href={`https://wa.me/55${(leadSelecionado.whatsapp || leadSelecionado.telefone || '').replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
              >
                <Phone className="w-4 h-4" /> Abrir no WhatsApp
              </a>
            )}
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
                { label: 'Nome *', key: 'nome', type: 'text' },
                { label: 'Email *', key: 'email', type: 'email' },
                { label: 'Telefone', key: 'telefone', type: 'tel' },
                { label: 'WhatsApp', key: 'whatsapp', type: 'tel' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-[#71717A] mb-1 block">{f.label}</label>
                  <input
                    type={f.type}
                    value={novoLead[f.key as keyof typeof novoLead]}
                    onChange={e => setNovoLead(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#71717A] mb-1 block">Etapa</label>
                  <select value={novoLead.etapa} onChange={e => setNovoLead(prev => ({ ...prev, etapa: e.target.value as Etapa }))}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]">
                    {(Object.keys(etapaLabels) as Etapa[]).map(e => <option key={e} value={e}>{etapaLabels[e]}</option>)}
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
            <button onClick={criarLead} disabled={salvando || !novoLead.nome || !novoLead.email}
              className="w-full bg-[#7B3FE4] hover:bg-[#6B2FD4] disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
              {salvando ? 'Salvando...' : 'Criar Lead'}
            </button>
          </div>
        </div>
      )}

      {/* Modal novo referido */}
      {showNovoReferido && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Novo Referido</h3>
              <button onClick={() => setShowNovoReferido(false)} className="text-[#71717A] hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#71717A] mb-1 block">Lead de origem *</label>
                <select value={novoReferido.lead_origem_id} onChange={e => setNovoReferido(prev => ({ ...prev, lead_origem_id: e.target.value }))}
                  className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]">
                  <option value="">Selecione o lead...</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#71717A] mb-1 block">Nome</label>
                <input type="text" value={novoReferido.nome} onChange={e => setNovoReferido(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]" />
              </div>
              <div>
                <label className="text-xs text-[#71717A] mb-1 block">Telefone/WhatsApp *</label>
                <input type="tel" value={novoReferido.telefone} onChange={e => setNovoReferido(prev => ({ ...prev, telefone: e.target.value }))}
                  className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]" />
              </div>
              <div>
                <label className="text-xs text-[#71717A] mb-1 block">Tipo</label>
                <select value={novoReferido.tipo} onChange={e => setNovoReferido(prev => ({ ...prev, tipo: e.target.value as 'normal' | 'nao_fechou' }))}
                  className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]">
                  <option value="normal">20 referidos (fechou)</option>
                  <option value="nao_fechou">4 referidos (não fechou)</option>
                </select>
              </div>
            </div>
            <button onClick={criarReferido} disabled={salvando || !novoReferido.telefone || !novoReferido.lead_origem_id}
              className="w-full bg-[#7B3FE4] hover:bg-[#6B2FD4] disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
              {salvando ? 'Salvando...' : 'Adicionar Referido'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
