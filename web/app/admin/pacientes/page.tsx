'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import {
  HeartPulse, Search, RefreshCw, AlertTriangle, Clock,
  ChevronDown, ExternalLink, Filter,
} from 'lucide-react'

interface Patient {
  id: string
  nome: string
  telefone?: string
  idade?: number
  status: string
  hormonio?: string
  num_implantes?: number
  proximo_implante?: string
  queixa_principal?: string
  updated_at?: string
  medico_id?: string
  medico_nome?: string
}

const STATUS_STYLES: Record<string, string> = {
  ativo:    'bg-green-500/15 text-green-400 border-green-500/25',
  pendente: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  inativo:  'bg-[#3F3F46]/40 text-[#71717A] border-[#3F3F46]/40',
  alta:     'bg-blue-500/15 text-blue-400 border-blue-500/25',
}

function urgencyDays(dateStr?: string): number | null {
  if (!dateStr) return null
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
  return diff
}

export default function AdminPacientesPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterHormonio, setFilterHormonio] = useState('todos')
  const [sortBy, setSortBy] = useState<'nome' | 'proximo_implante' | 'updated_at'>('proximo_implante')
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: e } = await supabase
        .from('pacientes')
        .select('*')
        .order('updated_at', { ascending: false })
      if (e) throw e
      setPatients(data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar pacientes')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Derived stats
  const total = patients.length
  const ativos = patients.filter((p) => p.status === 'ativo').length
  const urgentes = patients.filter((p) => {
    const d = urgencyDays(p.proximo_implante)
    return d !== null && d <= 7 && d >= 0
  }).length
  const vencidos = patients.filter((p) => {
    const d = urgencyDays(p.proximo_implante)
    return d !== null && d < 0
  }).length

  const hormonios = ['todos', ...Array.from(new Set(patients.map((p) => p.hormonio).filter(Boolean) as string[]))]

  const filtered = patients
    .filter((p) => {
      const q = search.toLowerCase()
      const matchSearch = !q || p.nome?.toLowerCase().includes(q) || p.telefone?.includes(q) || p.queixa_principal?.toLowerCase().includes(q)
      const matchStatus = filterStatus === 'todos' || p.status === filterStatus
      const matchHorm = filterHormonio === 'todos' || p.hormonio === filterHormonio
      return matchSearch && matchStatus && matchHorm
    })
    .sort((a, b) => {
      if (sortBy === 'nome') return (a.nome ?? '').localeCompare(b.nome ?? '')
      if (sortBy === 'proximo_implante') {
        if (!a.proximo_implante) return 1
        if (!b.proximo_implante) return -1
        return new Date(a.proximo_implante).getTime() - new Date(b.proximo_implante).getTime()
      }
      return new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime()
    })

  function fmtDate(d?: string) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR')
  }

  function ImplanteBadge({ date }: { date?: string }) {
    const days = urgencyDays(date)
    if (days === null) return <span className="text-[#52525B] text-xs">—</span>
    if (days < 0) return (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
        <AlertTriangle className="w-3 h-3" />{Math.abs(days)}d atraso
      </span>
    )
    if (days <= 7) return (
      <span className="flex items-center gap-1 text-xs font-semibold text-yellow-400">
        <Clock className="w-3 h-3" />{days}d
      </span>
    )
    return <span className="text-xs text-[#71717A]">{fmtDate(date)}</span>
  }

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin', role: 'admin' }} title="Pacientes — Rede" />
        <main className="flex-1 overflow-y-auto px-6 py-6">

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total', value: total, color: 'text-white', sub: 'pacientes na rede' },
              { label: 'Ativos', value: ativos, color: 'text-green-400', sub: 'em tratamento' },
              { label: 'Urgentes ≤7d', value: urgentes, color: 'text-yellow-400', sub: 'próx. implante' },
              { label: 'Vencidos', value: vencidos, color: 'text-red-400', sub: 'aguardam reagendamento' },
            ].map((k) => (
              <div key={k.label} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl px-5 py-4">
                <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                <p className="text-xs font-semibold text-[#A1A1AA] mt-0.5">{k.label}</p>
                <p className="text-[10px] text-[#52525B] mt-0.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar paciente, queixa..."
                className="w-full bg-[#111113] border border-[#1C1C1E] rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-[#52525B] focus:outline-none focus:border-[#7B3FE4] transition-colors"
              />
            </div>

            {/* Status filter */}
            <div className="flex gap-1">
              {['todos', 'ativo', 'pendente', 'inativo', 'alta'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all ${
                    filterStatus === s
                      ? 'bg-[#7B3FE4] text-white'
                      : 'bg-[#111113] border border-[#1C1C1E] text-[#71717A] hover:text-white'
                  }`}
                >
                  {s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* Hormônio filter */}
            <div className="relative">
              <select
                value={filterHormonio}
                onChange={(e) => setFilterHormonio(e.target.value)}
                className="appearance-none bg-[#111113] border border-[#1C1C1E] rounded-xl pl-3 pr-8 py-2.5 text-sm text-[#A1A1AA] focus:outline-none focus:border-[#7B3FE4] cursor-pointer"
              >
                {hormonios.map((h) => (
                  <option key={h} value={h}>{h === 'todos' ? 'Hormônio: Todos' : h}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525B] pointer-events-none" />
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none bg-[#111113] border border-[#1C1C1E] rounded-xl pl-3 pr-8 py-2.5 text-sm text-[#A1A1AA] focus:outline-none focus:border-[#7B3FE4] cursor-pointer"
              >
                <option value="proximo_implante">Ordenar: Próx. Implante</option>
                <option value="updated_at">Ordenar: Atualizado</option>
                <option value="nome">Ordenar: Nome</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#52525B] pointer-events-none" />
            </div>

            <button onClick={load} className="p-2.5 bg-[#111113] border border-[#1C1C1E] rounded-xl text-[#71717A] hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-[#7B3FE4] border-t-transparent animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#52525B]">
                <HeartPulse className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Nenhum paciente encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1C1C1E]">
                      {['Paciente', 'Status', 'Hormônio', 'Nº Implantes', 'Próx. Implante', 'Queixa Principal', 'Atualizado'].map((h) => (
                        <th key={h} className="text-left text-[10px] font-semibold text-[#52525B] uppercase tracking-wider px-4 py-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr key={p.id} className="border-b border-[#1C1C1E] last:border-b-0 hover:bg-[#18181A] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#7B3FE4]/20 border border-[#7B3FE4]/30 flex items-center justify-center text-[#7B3FE4] font-semibold text-xs flex-shrink-0">
                              {p.nome?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{p.nome}</p>
                              <p className="text-xs text-[#52525B]">{p.idade ? `${p.idade} anos` : ''}{p.telefone ? ` · ${p.telefone}` : ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium border capitalize ${STATUS_STYLES[p.status] ?? STATUS_STYLES.inativo}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {p.hormonio ? (
                            <span className="bg-[#7B3FE4]/15 text-[#9D6BF0] border border-[#7B3FE4]/20 px-2 py-0.5 rounded-lg text-xs font-medium">
                              {p.hormonio}
                            </span>
                          ) : <span className="text-[#52525B] text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-white font-medium tabular-nums">
                          {p.num_implantes ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <ImplanteBadge date={p.proximo_implante} />
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <p className="text-xs text-[#A1A1AA] truncate">{p.queixa_principal ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#52525B] whitespace-nowrap">
                          {fmtDate(p.updated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {!loading && filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-[#1C1C1E] flex items-center justify-between">
                <p className="text-xs text-[#52525B]">{filtered.length} paciente{filtered.length !== 1 ? 's' : ''} exibidos</p>
                <button className="flex items-center gap-1.5 text-xs text-[#71717A] hover:text-[#7B3FE4] transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Exportar CSV
                </button>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
