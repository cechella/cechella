'use client'

import { useEffect, useState, useCallback } from 'react'

interface Pagamento {
  id: string
  lead_telefone: string
  nome: string | null
  valor: number
  status: string
  metodo: string
  created_at: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n / 100)
}

function statusBadge(s: string) {
  const map: Record<string, string> = {
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }
  return map[s] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

function metodoBadge(m: string) {
  const map: Record<string, string> = {
    cartao_avista: 'À vista',
    cartao_recorrente: 'Recorrente',
    pix: 'PIX',
    boleto: 'Boleto',
  }
  return map[m] || m
}

export default function PagamentosPage() {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [metodo, setMetodo] = useState('')
  const [status, setStatus] = useState('')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        tipo: 'pagamentos',
        page: String(page),
        limit: String(limit),
        ...(metodo ? { metodo } : {}),
        ...(status ? { status } : {}),
        ...(busca ? { busca } : {}),
      })
      const res = await fetch(`/api/admin/financeiro?${params}`)
      const json = await res.json()
      setPagamentos(json.pagamentos || [])
      setTotal(json.total || 0)
    } finally {
      setLoading(false)
    }
  }, [page, metodo, status, busca])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <a href="/admin/financeiro" className="text-gray-500 hover:text-gray-700 text-sm">← Financeiro</a>
        <h1 className="text-2xl font-bold">Pagamentos</h1>
        <span className="text-sm text-gray-400">{total} registros</span>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input
          className="border rounded px-3 py-1.5 text-sm dark:bg-gray-900 dark:border-gray-700"
          placeholder="Buscar telefone..."
          value={busca}
          onChange={e => { setBusca(e.target.value); setPage(1) }}
        />
        <select
          className="border rounded px-3 py-1.5 text-sm dark:bg-gray-900 dark:border-gray-700"
          value={metodo}
          onChange={e => { setMetodo(e.target.value); setPage(1) }}
        >
          <option value="">Todos métodos</option>
          <option value="cartao_avista">À vista</option>
          <option value="cartao_recorrente">Recorrente</option>
          <option value="pix">PIX</option>
        </select>
        <select
          className="border rounded px-3 py-1.5 text-sm dark:bg-gray-900 dark:border-gray-700"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
        >
          <option value="">Todos status</option>
          <option value="approved">Aprovado</option>
          <option value="pending">Pendente</option>
          <option value="rejected">Rejeitado</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <button
          onClick={() => load()}
          className="px-3 py-1.5 rounded text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          ↻ Atualizar
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Data</th>
              <th className="px-4 py-3 text-left">Nome / Telefone</th>
              <th className="px-4 py-3 text-left">Método</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            )}
            {!loading && pagamentos.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum pagamento encontrado</td></tr>
            )}
            {pagamentos.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(p.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{p.nome || '—'}</p>
                  <p className="text-gray-400 text-xs">{p.lead_telefone}</p>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{metodoBadge(p.metodo)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(p.status)}`}>
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{fmt(p.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex gap-2 justify-end">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40 dark:border-gray-700"
          >
            ← Anterior
          </button>
          <span className="px-3 py-1 text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40 dark:border-gray-700"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  )
}
