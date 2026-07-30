'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import {
  Users, Search, Plus, X, ChevronDown, Activity,
  Calendar, Phone, MessageSquare, Clock, TrendingUp,
  AlertTriangle, CheckCircle2, MoreVertical, Edit3,
  Trash2, Download, Filter, RefreshCw, Heart,
  Flame, Zap, Eye, FileText, Star, ArrowUpRight,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusPaciente = 'ativo' | 'inativo' | 'pendente' | 'alta'

interface Paciente {
  id: string
  nome: string
  telefone: string
  email?: string
  data_nascimento?: string
  cpf?: string
  status: StatusPaciente
  data_inicio?: string
  proximo_implante?: string
  numero_implantes: number
  observacoes?: string
  created_at: string
  updated_at: string
  peso?: number
  altura?: number
  queixa_principal?: string
  hormonio_principal?: string
}

// ─── Status config ────────────────────────────────────────────────────────────

const statusConfig: Record<StatusPaciente, { label: string; color: string; bg: string; border: string }> = {
  ativo: { label: 'Ativo', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  inativo: { label: 'Inativo', color: 'text-[#71717A]', bg: 'bg-[#27272A]/60', border: 'border-[#3F3F46]' },
  pendente: { label: 'Pendente', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  alta: { label: 'Alta', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
}

const hormonioBadgeColor: Record<string, string> = {
  'Testosterona': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  'Estradiol': 'text-pink-400 bg-pink-500/10 border-pink-500/20',
  'Progesterona': 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  'Dutasterida': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  'DHEA': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  'Terapia Combinada': 'text-[#7B3FE4] bg-[#7B3FE4]/10 border-[#7B3FE4]/20',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nome: string) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function avatarColor(nome: string) {
  const colors = [
    'bg-[#7B3FE4]/20 text-[#9558EE]',
    'bg-blue-500/20 text-blue-400',
    'bg-emerald-500/20 text-emerald-400',
    'bg-pink-500/20 text-pink-400',
    'bg-amber-500/20 text-amber-400',
    'bg-cyan-500/20 text-cyan-400',
  ]
  let h = 0
  for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) & 0xffff
  return colors[h % colors.length]
}

function calcIdade(dataNasc?: string) {
  if (!dataNasc) return null
  const hoje = new Date()
  const nasc = new Date(dataNasc)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

function diasParaProximoImplante(data?: string) {
  if (!data) return null
  const diff = Math.round((new Date(data).getTime() - Date.now()) / 86400000)
  return diff
}

function formatDate(s?: string) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('pt-BR')
}

// ─── Demo data (used when Supabase table doesn't exist yet) ───────────────────

const DEMO_PACIENTES: Paciente[] = [
  {
    id: '1', nome: 'Fernanda Oliveira', telefone: '47991234567', email: 'fernanda@email.com',
    data_nascimento: '1982-04-15', status: 'ativo', data_inicio: '2024-01-10',
    proximo_implante: '2026-08-20', numero_implantes: 5, peso: 62, altura: 165,
    queixa_principal: 'Fadiga e libido baixa', hormonio_principal: 'Testosterona',
    created_at: '2024-01-10', updated_at: '2026-07-01',
  },
  {
    id: '2', nome: 'Mariana Santos', telefone: '47992345678', email: 'mariana@email.com',
    data_nascimento: '1978-08-22', status: 'ativo', data_inicio: '2023-06-05',
    proximo_implante: '2026-09-10', numero_implantes: 8, peso: 58, altura: 162,
    queixa_principal: 'Fogachos e insônia', hormonio_principal: 'Terapia Combinada',
    created_at: '2023-06-05', updated_at: '2026-07-15',
  },
  {
    id: '3', nome: 'Claudia Pereira', telefone: '47993456789', status: 'pendente',
    data_nascimento: '1990-02-28', data_inicio: undefined, numero_implantes: 0,
    queixa_principal: 'Humor instável e ganho de peso', hormonio_principal: 'Estradiol',
    created_at: '2026-07-25', updated_at: '2026-07-25',
  },
  {
    id: '4', nome: 'Patricia Costa', telefone: '47994567890', email: 'patricia@email.com',
    data_nascimento: '1975-11-10', status: 'ativo', data_inicio: '2022-03-15',
    proximo_implante: '2026-07-31', numero_implantes: 12, peso: 70, altura: 170,
    queixa_principal: 'Perimenopausa', hormonio_principal: 'Progesterona',
    created_at: '2022-03-15', updated_at: '2026-07-20',
  },
  {
    id: '5', nome: 'Amanda Rodrigues', telefone: '47995678901', status: 'inativo',
    data_nascimento: '1988-07-03', data_inicio: '2023-09-01', numero_implantes: 3,
    queixa_principal: 'Ansiedade e irritabilidade', hormonio_principal: 'DHEA',
    created_at: '2023-09-01', updated_at: '2026-02-10',
  },
  {
    id: '6', nome: 'Beatriz Lima', telefone: '47996789012', email: 'beatriz@email.com',
    data_nascimento: '1985-12-19', status: 'alta', data_inicio: '2021-01-20',
    numero_implantes: 18, peso: 55, altura: 158,
    queixa_principal: 'Disfunção sexual feminina', hormonio_principal: 'Dutasterida',
    created_at: '2021-01-20', updated_at: '2026-06-01',
  },
]

// ─── Components ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusPaciente }) {
  const cfg = statusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      {status === 'ativo' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
      {cfg.label}
    </span>
  )
}

function HormonioBadge({ h }: { h?: string }) {
  if (!h) return <span className="text-[#52525B] text-xs">—</span>
  const cls = hormonioBadgeColor[h] ?? 'text-[#A1A1AA] bg-[#27272A]/60 border-[#3F3F46]'
  return <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{h}</span>
}

function ProximoImplanteCell({ data }: { data?: string }) {
  const dias = diasParaProximoImplante(data)
  if (dias === null) return <span className="text-[#52525B] text-xs">—</span>
  if (dias < 0) return <span className="text-red-400 text-xs font-semibold flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Atrasado</span>
  if (dias <= 7) return <span className="text-amber-400 text-xs font-semibold flex items-center gap-1"><Flame className="w-3 h-3" /> {dias}d</span>
  if (dias <= 30) return <span className="text-yellow-400 text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {dias}d</span>
  return <span className="text-[#71717A] text-xs">{formatDate(data)}</span>
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>(DEMO_PACIENTES)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusPaciente | 'todos'>('todos')
  const [filtroHormonio, setFiltroHormonio] = useState('todos')
  const [sortBy, setSortBy] = useState<'nome' | 'implantes' | 'proximo'>('proximo')
  const [detalhe, setDetalhe] = useState<Paciente | null>(null)
  const [modalNovo, setModalNovo] = useState(false)
  const [menuAberto, setMenuAberto] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Paciente>>({})

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pacientes')
      .select('*')
      .order('updated_at', { ascending: false })
    if (!error && data && data.length > 0) setPacientes(data)
    else setPacientes(DEMO_PACIENTES)
    setLoading(false)
  }, []) // eslint-disable-line

  useEffect(() => { carregar() }, [carregar])

  // ─── KPIs ──────────────────────────────────────────────────────────────────

  const totalAtivos = pacientes.filter(p => p.status === 'ativo').length
  const totalPendentes = pacientes.filter(p => p.status === 'pendente').length
  const implantesUrgentes = pacientes.filter(p => {
    const d = diasParaProximoImplante(p.proximo_implante)
    return d !== null && d <= 7 && d >= 0
  }).length
  const mediaImplantes = pacientes.filter(p => p.numero_implantes > 0).length
    ? Math.round(pacientes.reduce((a, p) => a + p.numero_implantes, 0) / pacientes.filter(p => p.numero_implantes > 0).length * 10) / 10
    : 0

  const kpis = [
    { label: 'Total Pacientes', value: pacientes.length, icon: Users, color: 'text-[#7B3FE4]', borderColor: '#7B3FE4' },
    { label: 'Ativos', value: totalAtivos, icon: Activity, color: 'text-emerald-400', borderColor: '#34D399' },
    { label: 'Urgentes (≤7d)', value: implantesUrgentes, icon: Flame, color: 'text-amber-400', borderColor: '#F59E0B' },
    { label: 'Pendentes', value: totalPendentes, icon: Clock, color: 'text-yellow-400', borderColor: '#EAB308' },
    { label: 'Média Implantes', value: mediaImplantes, icon: TrendingUp, color: 'text-blue-400', borderColor: '#3B82F6' },
  ]

  // ─── Filters ───────────────────────────────────────────────────────────────

  const hormonioOptions = ['todos', ...Array.from(new Set(pacientes.map(p => p.hormonio_principal).filter(Boolean)))]

  const filtrados = pacientes
    .filter(p => {
      const q = search.toLowerCase()
      const matchSearch = !q || p.nome.toLowerCase().includes(q) || p.telefone.includes(q) || (p.email ?? '').toLowerCase().includes(q)
      const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus
      const matchHormonio = filtroHormonio === 'todos' || p.hormonio_principal === filtroHormonio
      return matchSearch && matchStatus && matchHormonio
    })
    .sort((a, b) => {
      if (sortBy === 'nome') return a.nome.localeCompare(b.nome)
      if (sortBy === 'implantes') return b.numero_implantes - a.numero_implantes
      if (sortBy === 'proximo') {
        const da = diasParaProximoImplante(a.proximo_implante) ?? 9999
        const db = diasParaProximoImplante(b.proximo_implante) ?? 9999
        return da - db
      }
      return 0
    })

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async function salvarNovo() {
    const novo: Paciente = {
      id: String(Date.now()),
      nome: form.nome ?? '',
      telefone: form.telefone ?? '',
      email: form.email,
      data_nascimento: form.data_nascimento,
      status: (form.status as StatusPaciente) ?? 'pendente',
      data_inicio: form.data_inicio,
      proximo_implante: form.proximo_implante,
      numero_implantes: form.numero_implantes ?? 0,
      observacoes: form.observacoes,
      queixa_principal: form.queixa_principal,
      hormonio_principal: form.hormonio_principal,
      peso: form.peso,
      altura: form.altura,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('pacientes').insert([novo])
    if (!error) {
      setPacientes(prev => [novo, ...prev])
      setModalNovo(false)
      setForm({})
    } else {
      setPacientes(prev => [novo, ...prev])
      setModalNovo(false)
      setForm({})
    }
  }

  async function excluirPaciente(id: string) {
    await supabase.from('pacientes').delete().eq('id', id)
    setPacientes(prev => prev.filter(p => p.id !== id))
    setMenuAberto(null)
    if (detalhe?.id === id) setDetalhe(null)
  }

  async function atualizarStatus(id: string, status: StatusPaciente) {
    await supabase.from('pacientes').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setPacientes(prev => prev.map(p => p.id === id ? { ...p, status } : p))
    setMenuAberto(null)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Pacientes" />
        <main className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Header ── */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#7B3FE4]" />
                Gestão de Pacientes
                <span className="text-xs text-[#52525B] font-normal ml-1">· AO VIVO</span>
                {!loading && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              </h1>
              <p className="text-xs text-[#52525B] mt-0.5">Acompanhe seus pacientes, implantes e próximas consultas</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={carregar}
                className="w-8 h-8 rounded-lg bg-[#111113] border border-[#1C1C1E] flex items-center justify-center text-[#52525B] hover:text-white hover:border-[#3F3F46] transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => { setModalNovo(true); setForm({}) }}
                className="flex items-center gap-2 bg-[#7B3FE4] hover:bg-[#6D35CC] text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Novo Paciente
              </button>
            </div>
          </div>

          {/* ── KPIs ── */}
          <div className="grid grid-cols-5 gap-3">
            {kpis.map((k, i) => {
              const Icon = k.icon
              return (
                <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-xl p-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: k.borderColor }} />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-medium text-[#52525B] uppercase tracking-wider">{k.label}</p>
                      <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-lg bg-[#1C1C1E] flex items-center justify-center ${k.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Filters ── */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525B]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar paciente, telefone..."
                className="w-full bg-[#111113] border border-[#1C1C1E] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-[#52525B] focus:outline-none focus:border-[#7B3FE4]/50"
              />
            </div>

            {(['todos', 'ativo', 'pendente', 'inativo', 'alta'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`text-xs font-medium px-3 py-2 rounded-lg border transition-all capitalize ${
                  filtroStatus === s
                    ? 'bg-[#7B3FE4]/15 border-[#7B3FE4]/40 text-[#9558EE]'
                    : 'bg-[#111113] border-[#1C1C1E] text-[#71717A] hover:text-white hover:border-[#3F3F46]'
                }`}
              >
                {s === 'todos' ? 'Todos' : statusConfig[s as StatusPaciente]?.label ?? s}
              </button>
            ))}

            <div className="relative">
              <select
                value={filtroHormonio}
                onChange={e => setFiltroHormonio(e.target.value)}
                className="appearance-none bg-[#111113] border border-[#1C1C1E] rounded-lg pl-3 pr-7 py-2 text-xs text-[#71717A] hover:text-white hover:border-[#3F3F46] focus:outline-none focus:border-[#7B3FE4]/50 transition-all cursor-pointer"
              >
                <option value="todos">Hormônio: Todos</option>
                {hormonioOptions.filter(h => h !== 'todos').map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#52525B] pointer-events-none" />
            </div>

            <div className="relative ml-auto">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none bg-[#111113] border border-[#1C1C1E] rounded-lg pl-3 pr-7 py-2 text-xs text-[#71717A] focus:outline-none focus:border-[#7B3FE4]/50 transition-all cursor-pointer"
              >
                <option value="proximo">Ordenar: Próximo Implante</option>
                <option value="nome">Ordenar: Nome</option>
                <option value="implantes">Ordenar: Nº Implantes</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#52525B] pointer-events-none" />
            </div>
          </div>

          {/* ── Table ── */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1C1C1E]">
                    {['Paciente', 'Status', 'Hormônio', 'Nº Implantes', 'Próximo Implante', 'Queixa Principal', 'Atualizado', 'Ações'].map(h => (
                      <th key={h} className="text-left text-[10px] font-semibold text-[#52525B] uppercase tracking-wider px-4 py-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-[#52525B] text-sm">
                        <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
                        Nenhum paciente encontrado
                      </td>
                    </tr>
                  ) : filtrados.map(p => {
                    const ini = getInitials(p.nome)
                    const av = avatarColor(p.nome)
                    const idade = calcIdade(p.data_nascimento)
                    return (
                      <tr key={p.id} className="border-b border-[#1C1C1E]/50 hover:bg-[#18181A]/40 transition-colors group">
                        {/* Paciente */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${av}`}>
                              {ini}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{p.nome}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {idade && <span className="text-[10px] text-[#52525B]">{idade} anos</span>}
                                {p.telefone && (
                                  <a href={`https://wa.me/55${p.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                                    className="text-[10px] text-[#52525B] hover:text-emerald-400 transition-colors flex items-center gap-0.5">
                                    <Phone className="w-2.5 h-2.5" /> {p.telefone}
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3"><StatusBadge status={p.status} /></td>

                        {/* Hormônio */}
                        <td className="px-4 py-3"><HormonioBadge h={p.hormonio_principal} /></td>

                        {/* Nº Implantes */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Star className="w-3 h-3 text-[#7B3FE4]" />
                            <span className="text-sm font-semibold text-white">{p.numero_implantes}</span>
                          </div>
                        </td>

                        {/* Próximo Implante */}
                        <td className="px-4 py-3"><ProximoImplanteCell data={p.proximo_implante} /></td>

                        {/* Queixa */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-[#A1A1AA] max-w-[160px] truncate block">{p.queixa_principal ?? '—'}</span>
                        </td>

                        {/* Atualizado */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-[#52525B]">{formatDate(p.updated_at)}</span>
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setDetalhe(p)}
                              className="w-7 h-7 rounded-lg bg-[#1C1C1E] hover:bg-[#27272A] flex items-center justify-center text-[#52525B] hover:text-white transition-all opacity-0 group-hover:opacity-100"
                              title="Ver detalhes"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={`https://wa.me/55${p.telefone.replace(/\D/g, '')}`}
                              target="_blank" rel="noopener noreferrer"
                              className="w-7 h-7 rounded-lg bg-[#1C1C1E] hover:bg-emerald-500/10 flex items-center justify-center text-[#52525B] hover:text-emerald-400 transition-all opacity-0 group-hover:opacity-100"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </a>
                            <div className="relative">
                              <button
                                onClick={() => setMenuAberto(menuAberto === p.id ? null : p.id)}
                                className="w-7 h-7 rounded-lg bg-[#1C1C1E] hover:bg-[#27272A] flex items-center justify-center text-[#52525B] hover:text-white transition-all opacity-0 group-hover:opacity-100"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                              {menuAberto === p.id && (
                                <div className="absolute right-0 top-8 z-50 bg-[#1C1C1E] border border-[#27272A] rounded-xl shadow-2xl shadow-black/40 py-1 min-w-[160px]">
                                  {(['ativo', 'inativo', 'pendente', 'alta'] as StatusPaciente[]).filter(s => s !== p.status).map(s => (
                                    <button key={s} onClick={() => atualizarStatus(p.id, s)}
                                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[#A1A1AA] hover:text-white hover:bg-[#27272A] transition-colors capitalize">
                                      <CheckCircle2 className="w-3.5 h-3.5" /> Marcar {statusConfig[s].label}
                                    </button>
                                  ))}
                                  <div className="border-t border-[#27272A] my-1" />
                                  <button onClick={() => excluirPaciente(p.id)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-[#1C1C1E] flex items-center justify-between">
              <span className="text-[11px] text-[#52525B]">{filtrados.length} paciente{filtrados.length !== 1 ? 's' : ''} exibido{filtrados.length !== 1 ? 's' : ''}</span>
              <button className="flex items-center gap-1.5 text-xs text-[#52525B] hover:text-white transition-colors">
                <Download className="w-3 h-3" /> Exportar CSV
              </button>
            </div>
          </div>

        </main>
      </div>

      {/* ── Modal: Detalhes do Paciente ── */}
      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetalhe(null)} />
          <div className="relative z-10 bg-[#111113] border border-[#1C1C1E] rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1C1C1E]">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${avatarColor(detalhe.nome)}`}>
                  {getInitials(detalhe.nome)}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">{detalhe.nome}</h2>
                  <p className="text-xs text-[#52525B]">{calcIdade(detalhe.data_nascimento) ? `${calcIdade(detalhe.data_nascimento)} anos · ` : ''}{detalhe.telefone}</p>
                </div>
              </div>
              <button onClick={() => setDetalhe(null)} className="w-8 h-8 rounded-lg bg-[#1C1C1E] flex items-center justify-center text-[#52525B] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Status + Hormônio */}
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={detalhe.status} />
                <HormonioBadge h={detalhe.hormonio_principal} />
                <span className="text-xs text-[#52525B] flex items-center gap-1"><Star className="w-3 h-3 text-[#7B3FE4]" /> {detalhe.numero_implantes} implante{detalhe.numero_implantes !== 1 ? 's' : ''}</span>
              </div>

              {/* Grid de info */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Data de Início', value: formatDate(detalhe.data_inicio) },
                  { label: 'Próximo Implante', value: detalhe.proximo_implante ? <ProximoImplanteCell data={detalhe.proximo_implante} /> : '—' },
                  { label: 'Peso', value: detalhe.peso ? `${detalhe.peso} kg` : '—' },
                  { label: 'Altura', value: detalhe.altura ? `${detalhe.altura} cm` : '—' },
                  { label: 'E-mail', value: detalhe.email ?? '—' },
                  { label: 'CPF', value: detalhe.cpf ?? '—' },
                ].map((item, i) => (
                  <div key={i} className="bg-[#18181A] border border-[#1C1C1E] rounded-xl p-3">
                    <p className="text-[9px] font-semibold text-[#52525B] uppercase tracking-wider mb-1">{item.label}</p>
                    <div className="text-xs text-white">{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Queixa */}
              {detalhe.queixa_principal && (
                <div className="bg-[#18181A] border border-[#1C1C1E] rounded-xl p-3">
                  <p className="text-[9px] font-semibold text-[#52525B] uppercase tracking-wider mb-1">Queixa Principal</p>
                  <p className="text-xs text-[#A1A1AA]">{detalhe.queixa_principal}</p>
                </div>
              )}

              {/* Observações */}
              {detalhe.observacoes && (
                <div className="bg-[#18181A] border border-[#1C1C1E] rounded-xl p-3">
                  <p className="text-[9px] font-semibold text-[#52525B] uppercase tracking-wider mb-1">Observações</p>
                  <p className="text-xs text-[#A1A1AA]">{detalhe.observacoes}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 px-5 py-4 border-t border-[#1C1C1E]">
              <a
                href={`https://wa.me/55${detalhe.telefone.replace(/\D/g, '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold py-2.5 rounded-xl hover:bg-emerald-500/20 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
              </a>
              <button className="flex-1 flex items-center justify-center gap-2 bg-[#7B3FE4]/10 border border-[#7B3FE4]/30 text-[#9558EE] text-xs font-semibold py-2.5 rounded-xl hover:bg-[#7B3FE4]/20 transition-colors">
                <FileText className="w-3.5 h-3.5" /> Prontuário
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Novo Paciente ── */}
      {modalNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalNovo(false)} />
          <div className="relative z-10 bg-[#111113] border border-[#1C1C1E] rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1C1C1E]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Plus className="w-4 h-4 text-[#7B3FE4]" /> Novo Paciente</h2>
              <button onClick={() => setModalNovo(false)} className="w-8 h-8 rounded-lg bg-[#1C1C1E] flex items-center justify-center text-[#52525B] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {[
                { label: 'Nome completo *', key: 'nome', type: 'text', placeholder: 'Nome da paciente' },
                { label: 'Telefone *', key: 'telefone', type: 'tel', placeholder: '47991234567' },
                { label: 'E-mail', key: 'email', type: 'email', placeholder: 'email@exemplo.com' },
                { label: 'Data de nascimento', key: 'data_nascimento', type: 'date' },
                { label: 'CPF', key: 'cpf', type: 'text', placeholder: '000.000.000-00' },
                { label: 'Peso (kg)', key: 'peso', type: 'number', placeholder: '60' },
                { label: 'Altura (cm)', key: 'altura', type: 'number', placeholder: '165' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[10px] font-semibold text-[#52525B] uppercase tracking-wider mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(form as Record<string, string | number | undefined>)[f.key] as string ?? ''}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#52525B] focus:outline-none focus:border-[#7B3FE4]/50"
                  />
                </div>
              ))}
              <div>
                <label className="block text-[10px] font-semibold text-[#52525B] uppercase tracking-wider mb-1">Hormônio Principal</label>
                <select
                  value={form.hormonio_principal ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, hormonio_principal: e.target.value }))}
                  className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7B3FE4]/50"
                >
                  <option value="">Selecionar</option>
                  {Object.keys(hormonioBadgeColor).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#52525B] uppercase tracking-wider mb-1">Queixa Principal</label>
                <textarea
                  rows={2}
                  placeholder="Descreva a queixa principal da paciente..."
                  value={form.queixa_principal ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, queixa_principal: e.target.value }))}
                  className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#52525B] focus:outline-none focus:border-[#7B3FE4]/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#52525B] uppercase tracking-wider mb-1">Próximo Implante</label>
                <input
                  type="date"
                  value={form.proximo_implante ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, proximo_implante: e.target.value }))}
                  className="w-full bg-[#18181A] border border-[#1C1C1E] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7B3FE4]/50"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 px-5 py-4 border-t border-[#1C1C1E]">
              <button onClick={() => setModalNovo(false)}
                className="flex-1 py-2.5 text-xs font-semibold text-[#71717A] bg-[#1C1C1E] border border-[#27272A] rounded-xl hover:text-white hover:border-[#3F3F46] transition-colors">
                Cancelar
              </button>
              <button
                onClick={salvarNovo}
                disabled={!form.nome || !form.telefone}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-[#7B3FE4] rounded-xl hover:bg-[#6D35CC] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close menus on outside click */}
      {menuAberto && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuAberto(null)} />
      )}
    </div>
  )
}
