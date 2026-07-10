'use client'

import { useEffect, useState, useCallback } from 'react'

interface Assinatura {
  id: string
  lead_telefone: string
  nome: string | null
  valor: number
  status: string
  parcelas_pagas: number
  parcelas_total: number
  proxima_cobranca: string | null
  created_at: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n / 100)
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    ativo: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    pausado: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    concluido: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    pendente: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }
  return map[s] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

export default function AssinaturasPage() {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(status ? { status } : {}),
        ...(busca ? { busca } : {}),
      })
      const res = await fetch(`/api/admin/financeiro/assinaturas?${params}`)
      const json = await res.json()
      setAssinaturas(json.assinaturas || [])
      setTotal(json.total || 0)
    } finally {
      setLoading(false)
    }
  }, [page, status, busca])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <a href="/admin/financeiro" className="text-gray-500 hover:text-gray-700 text-sm">← Financeiro</a>
        <h1 className="text-2xl font-bold">Assinaturas</h1>
        <span className="text-sm text-gray-400">{total} registros</span>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          className="border rounded px-3 py-1.5 text-sm dark:bg-gray-900 dark:border-gray-700"
          placeholder="Buscar telefone..."
          value={busca}
          onChange={e => { setBusca(e.target.value); setPage(1) }}
        />
        <select
          className="border rounded px-3 py-1.5 text-sm dark:bg-gray-900 dark:border-gray-700"
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
        >
          <option value="">Todos status</option>
          <option value="ativo">Ativo</option>
          <option value="pausado">Pausado</option>
          <option value="cancelado">Cancelado</option>
          <option value="concluido">Concluído</option>
          <option value="pendente">Pendente</option>
        </select>
        <button
          onClick={() => load()}
          className="px-3 py-1.5 rounded text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          ↻ Atualizar
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Progresso</th>
              <th className="px-4 py-3 text-left">Próx. cobrança</th>
              <th className="px-4 py-3 text-right">Valor/mês</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Carregando...</td></tr>
            )}
            {!loading && assinaturas.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhuma assinatura encontrada</td></tr>
            )}
            {assinaturas.map(a => {
              const pct = a.parcelas_total > 0 ? Math.round((a.parcelas_pagas / a.parcelas_total) * 100) : 0
              const vencida = a.proxima_cobranca && new Date(a.proxima_cobranca) < new Date() && a.status === 'ativo'
              return (
                <tr key={a.id} className={`hover:bg-gray-50 dark:hover:bg-gray-900/50 ${vencida ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.nome || '—'}</p>
                    <p className="text-gray-400 text-xs">{a.lead_telefone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(a.status)}`}>
                      {a.status}
                    </span>
                    {vencida && <span className="ml-2 text-xs text-amber-600 font-medium">⚠ vencida</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-indigo-500 h-1.5 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{a.parcelas_pagas}/{a.parcelas_total}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {a.proxima_cobranca
                      ? new Date(a.proxima_cobranca).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{fmt(a.valor)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

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
