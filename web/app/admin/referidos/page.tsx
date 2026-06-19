'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import { Flame, Circle, Phone, RefreshCw, Search, CheckCircle, Clock, PhoneCall } from 'lucide-react'

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
      .from('referidos')
      .select('*')
      .order('prioridade', { ascending: true })
      .order('created_at', { ascending: false })
    if (data) setReferidos(data as Referido[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  const atualizarStatus = async (id: string, status: StatusReferido) => {
    setAtualizando(id)
    await supabase.from('referidos').update({ status }).eq('id', id)
    setReferidos(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    setAtualizando(null)
  }

  const indicadores = [...new Set(referidos.map(r => r.indicado_por_nome).filter(Boolean))] as string[]

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

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Referidos Qualificados — Ana IA" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

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
                      return (
                        <tr key={ref.id} className="border-b border-[#1C1C1E] hover:bg-[#18181A] transition-colors">
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
                            <p className="text-sm font-medium text-white">{ref.nome || '—'}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-xs text-[#A1A1AA] font-mono">{ref.telefone || '—'}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-xs text-white">{ref.profissao || <span className="text-[#71717A]">—</span>}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-xs text-white">{ref.hobby || <span className="text-[#71717A]">—</span>}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-xs text-[#A1A1AA]">{ref.indicado_por_nome || '—'}</p>
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
