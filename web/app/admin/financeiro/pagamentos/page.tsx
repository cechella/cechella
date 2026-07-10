'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  CreditCard, Repeat, Search, Filter, ChevronLeft,
  ChevronRight, ExternalLink, Copy, RefreshCw, ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

type Pagamento = {
  id: string
  created_at: string
  lead_telefone: string
  nome: string | null
  metodo: string
  valor: number
  status: string
  parcelas: number
  payment_id: string
  recorrente: boolean
}

const METODOS: Record<string, { label: string; color: string }> = {
  cartao_avista: { label: 'À Vista', color: 'text-green-400 bg-green-500/10' },
  cartao_recorrente: { label: 'Recorrente', color: 'text-blue-400 bg-blue-500/10' },
}

const STATUS_COLORS: Record<string, string> = {
  approved: 'text-green-400 bg-green-500/10',
  pending: 'text-yellow-400 bg-yellow-500/10',
  rejected: 'text-red-400 bg-red-500/10',
  cancelled: 'text-zinc-400 bg-zinc-500/10',
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function PagamentosContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const page = Number(searchParams.get('page') || '1')
  const metodo = searchParams.get('metodo') || ''
  const status = searchParams.get('status') || ''
  const [busca, setBusca] = useState(searchParams.get('busca') || '')
  const [buscaInput, setBuscaInput] = useState(busca)

  const LIMIT = 20
  const totalPages = Math.ceil(total / LIMIT)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        tipo: 'pagamentos',
        page: String(page),
        limit: String(LIMIT),
        ...(metodo && { metodo }),
        ...(status && { status }),
        ...(busca && { busca }),
      })
      const r = await fetch(`/api/admin/financeiro?${params}`)
      const d = await r.json()
      setPagamentos(d.pagamentos || [])
      setTotal(d.total || 0)
    } finally {
      setLoading(false)
    }
  }, [page, metodo, status, busca])

  useEffect(() => { carregar() }, [carregar])

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    p.delete('page')
    router.push(`/admin/financeiro/pagamentos?${p}`)
  }

  function setPage(n: number) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('page', String(n))
    router.push(`/admin/financeiro/pagamentos?${p}`)
  }

  function handleBuscaSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusca(buscaInput)
    setParam('busca', buscaInput)
  }

  function copiar(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/financeiro" className="text-zinc-500 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Pagamentos</h1>
                <p className="text-zinc-500 text-sm">{total} transações encontradas</p>
              </div>
            </div>
            <button
              onClick={carregar}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3">
            {/* Busca */}
            <form onSubmit={handleBuscaSubmit} className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-3 gap-2 h-9">
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <input
                className="bg-transparent text-sm text-white placeholder-zinc-600 outline-none w-40"
                placeholder="Buscar telefone..."
                value={buscaInput}
                onChange={e => setBuscaInput(e.target.value)}
              />
            </form>

            {/* Método */}
            <div className="flex bg-zinc-800 rounded-lg p-0.5">
              {[
                { label: 'Todos', value: '' },
                { label: 'À Vista', value: 'cartao_avista' },
                { label: 'Recorrente', value: 'cartao_recorrente' },
              ].map(o => (
                <button
                  key={o.value}
                  onClick={() => setParam('metodo', o.value)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    metodo === o.value
                      ? 'bg-purple-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {/* Status */}
            <div className="flex bg-zinc-800 rounded-lg p-0.5">
              {[
                { label: 'Todos', value: '' },
                { label: 'Aprovado', value: 'approved' },
                { label: 'Recusado', value: 'rejected' },
              ].map(o => (
                <button
                  key={o.value}
                  onClick={() => setParam('status', o.value)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    status === o.value
                      ? 'bg-purple-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Data</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Lead</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Método</th>
                    <th className="text-right px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Valor</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Payment ID</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-zinc-800/50">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <div className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${60 + j * 10}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : pagamentos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-zinc-600">
                        Nenhum pagamento encontrado
                      </td>
                    </tr>
                  ) : (
                    pagamentos.map(p => {
                      const metodoInfo = METODOS[p.metodo] || { label: p.metodo, color: 'text-zinc-400 bg-zinc-500/10' }
                      const statusColor = STATUS_COLORS[p.status] || 'text-zinc-400 bg-zinc-500/10'
                      return (
                        <tr key={p.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                          <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                            {fmtData(p.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-white text-sm">{p.nome || '—'}</div>
                            <div className="text-zinc-500 text-xs">{p.lead_telefone}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${metodoInfo.color}`}>
                              {p.metodo === 'cartao_avista'
                                ? <CreditCard className="w-3 h-3" />
                                : <Repeat className="w-3 h-3" />
                              }
                              {metodoInfo.label}
                              {p.parcelas > 1 && ` ${p.parcelas}x`}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-white whitespace-nowrap">
                            {fmt(p.valor)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>
                              {p.status === 'approved' ? 'Aprovado'
                                : p.status === 'rejected' ? 'Recusado'
                                : p.status === 'pending' ? 'Pendente'
                                : p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-zinc-500 text-xs font-mono">
                              {p.payment_id ? `${p.payment_id.slice(0, 12)}…` : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {p.payment_id && (
                                <button
                                  onClick={() => copiar(p.payment_id)}
                                  className="text-zinc-500 hover:text-white transition-colors"
                                  title="Copiar Payment ID"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                <span className="text-zinc-500 text-xs">
                  Página {page} de {totalPages} — {total} registros
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="p-1.5 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const n = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                    return (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
                          n === page
                            ? 'bg-purple-600 text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {n}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default function PagamentosPage() {
  return (
    <Suspense>
      <PagamentosContent />
    </Suspense>
  )
}
