'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import { Flame, Circle, Phone, RefreshCw, Search, CheckCircle, Clock, PhoneCall, Copy, Check, CreditCard, Users, TrendingUp } from 'lucide-react'

type StatusReferido = 'aguardando' | 'contatado' | 'fechado'
type FiltroPrioridade = 'todas' | '1' | '2'
type FiltroStatus = 'todos' | StatusReferido

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
}

const statusConfig: Record<StatusReferido, { label: string; color: string; icon: React.ReactNode }> = {
  aguardando: {
    label: 'Aguardando',
    color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
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

export default function ReferidosPage() {
  const [referidos, setReferidos] = useState<Referido[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroPrioridade, setFiltroPrioridade] = useState<FiltroPrioridade>('todas')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')
  const [filtroIndicador, setFiltroIndicador] = useState<string>('todos')
  const [atualizando, setAtualizando] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('contatos_referidos')
      .select('*')
      .order('prioridade', { ascending: true })
      .order('created_at', { ascending: false })
    if (data) setReferidos(data as Referido[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  const atualizarStatus = async (id: string, status: StatusReferido) => {
    setAtualizando(id)
    await supabase.from('contatos_referidos').update({ status }).eq('id', id)
    setReferidos(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setAtualizando(null)
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

  const totalAlta = referidos.filter(r => r.prioridade === 1).length
  const totalNormal = referidos.filter(r => r.prioridade === 2).length
  const totalAguardando = referidos.filter(r => r.status === 'aguardando').length
  const totalContatado = referidos.filter(r => r.status === 'contatado').length
  const totalFechado = referidos.filter(r => r.status === 'fechado').length

  // Summary banner: breakdown by source
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
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Contatos Referidos — Ana IA" />
        <main className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Summary Banner */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#7B3FE4]/10 rounded-xl">
                  <Users className="w-5 h-5 text-[#7B3FE4]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{total}</p>
                  <p className="text-xs text-[#71717A]">contatos referidos no total</p>
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
              </div>
            </div>

            {/* Pipeline progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#71717A]">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Pipeline de conversão</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" /> Aguardando {pctAguardando}%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Contatado {pctContatado}%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Fechado {pctFechado}%</span>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-[#1C1C1E] overflow-hidden flex">
                {totalAguardando > 0 && (
                  <div
                    className="h-full bg-zinc-500 transition-all"
                    style={{ width: `${pctAguardando}%` }}
                  />
                )}
                {totalContatado > 0 && (
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${pctContatado}%` }}
                  />
                )}
                {totalFechado > 0 && (
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${pctFechado}%` }}
                  />
                )}
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
              { label: 'Total Referidos', value: referidos.length, color: 'text-white' },
              { label: 'Prioridade Alta', value: totalAlta, color: 'text-red-400', sub: 'profissão + hobby' },
              { label: 'Prioridade Normal', value: totalNormal, color: 'text-yellow-400', sub: 'nome + telefone' },
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
            <select
              value={filtroPrioridade}
              onChange={e => setFiltroPrioridade(e.target.value as FiltroPrioridade)}
              className="bg-[#111113] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]"
            >
              <option value="todas">Prioridade</option>
              <option value="1">Alta (profissão+hobby)</option>
              <option value="2">Normal</option>
            </select>
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value as FiltroStatus)}
              className="bg-[#111113] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]"
            >
              <option value="todos">Status</option>
              <option value="aguardando">Aguardando</option>
              <option value="contatado">Contatado</option>
              <option value="fechado">Fechado</option>
            </select>
            <select
              value={filtroIndicador}
              onChange={e => setFiltroIndicador(e.target.value)}
              className="bg-[#111113] border border-[#1C1C1E] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#7B3FE4]"
            >
              <option value="todos">Indicado por</option>
              {indicadores.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <button
              onClick={carregar}
              className="p-2.5 bg-[#111113] border border-[#1C1C1E] rounded-xl text-[#71717A] hover:text-white hover:border-[#7B3FE4] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Tabela */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1C1C1E]">
              <h2 className="text-sm font-semibold text-white">{filtrados.length} referidos</h2>
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
                <p className="text-xs mt-1">Os referidos aparecem aqui quando Ana coleta na Etapa 6</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1C1C1E]">
                      <th className="text-left text-xs text-[#71717A] font-medium px-6 py-3">Prioridade</th>
                      <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Nome</th>
                      <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Telefone</th>
                      <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Profissão</th>
                      <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Hobby</th>
                      <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Indicado por</th>
                      <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Status</th>
                      <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Recebido</th>
                      <th className="text-left text-xs text-[#71717A] font-medium px-4 py-3">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map(ref => {
                      const isAlta = ref.prioridade === 1
                      const sc = statusConfig[ref.status] || statusConfig.aguardando
                      const isViaCartao = !ref.profissao && !ref.hobby
                      const novo = isNovo(ref.created_at)
                      const borderColor = isAlta ? 'border-l-red-500' : 'border-l-yellow-500'
                      return (
                        <tr
                          key={ref.id}
                          className={`border-b border-[#1C1C1E] hover:bg-[#18181A] transition-colors border-l-2 ${borderColor}`}
                        >
                          <td className="px-6 py-4">
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
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white">{ref.nome || '—'}</p>
                              {novo && (
                                <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-[#7B3FE4]/20 text-[#A78BFA] border border-[#7B3FE4]/30">
                                  Novo
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center">
                              <p className="text-xs text-[#A1A1AA] font-mono">{ref.telefone || '—'}</p>
                              {ref.telefone && <CopyPhone phone={ref.telefone} />}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            {isViaCartao ? (
                              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-[#1C1C1E] text-[#52525B] border border-[#27272A]">
                                <CreditCard className="w-2.5 h-2.5" />
                                Via cartão
                              </span>
                            ) : (
                              <p className="text-xs text-white">{ref.profissao || <span className="text-[#71717A]">—</span>}</p>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {isViaCartao ? (
                              <span className="text-[#52525B] text-xs">—</span>
                            ) : (
                              <p className="text-xs text-white">{ref.hobby || <span className="text-[#71717A]">—</span>}</p>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${avatarColor(ref.indicado_por_nome)}`}>
                                {getInitials(ref.indicado_por_nome)}
                              </div>
                              <p className="text-xs text-[#A1A1AA]">{ref.indicado_por_nome || '—'}</p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border ${sc.color}`}>
                              {sc.icon}
                              {sc.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs text-[#71717A]">
                            {tempoRelativo(ref.created_at)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {ref.telefone && (
                                <a
                                  href={`https://wa.me/55${ref.telefone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-[#71717A] hover:text-green-400 hover:bg-[#1C1C1E] rounded-lg transition-colors"
                                  title="Abrir WhatsApp"
                                >
                                  <Phone className="w-4 h-4" />
                                </a>
                              )}
                              {ref.status === 'aguardando' && (
                                <button
                                  onClick={() => atualizarStatus(ref.id, 'contatado')}
                                  disabled={atualizando === ref.id}
                                  className="text-xs px-2.5 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {atualizando === ref.id ? '...' : 'Marcar contatado'}
                                </button>
                              )}
                              {ref.status === 'contatado' && (
                                <button
                                  onClick={() => atualizarStatus(ref.id, 'fechado')}
                                  disabled={atualizando === ref.id}
                                  className="text-xs px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg transition-colors disabled:opacity-50"
                                >
                                  {atualizando === ref.id ? '...' : 'Marcar fechado'}
                                </button>
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
        </main>
      </div>
    </div>
  )
}
