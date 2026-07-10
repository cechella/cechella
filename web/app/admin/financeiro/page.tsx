'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface Resumo {
  totalRecebido: number
  mrrAtivo: number
  assinaturasAtivas: number
  taxaConversao: number
  totalLeads: number
  leadsPagantes: number
  leadsRecuperacao: number
  aVistaCount: number
  aVistaTotal: number
  recorrenteCount: number
  recorrenteTotal: number
  graficoReceita: { data: string; valor: number }[]
}

const PERIODOS = [
  { label: '7 dias', value: '7' },
  { label: '30 dias', value: '30' },
  { label: '90 dias', value: '90' },
]

function fmt(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n / 100)
}

export default function FinanceiroPage() {
  const [data, setData] = useState<Resumo | null>(null)
  const [periodo, setPeriodo] = useState('30')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/financeiro?tipo=resumo&periodo=${periodo}`)
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => { load() }, [load])

  const pieData = data
    ? [
        { name: 'À vista', value: data.aVistaTotal },
        { name: 'Recorrente', value: data.recorrenteTotal },
      ]
    : []

  const COLORS = ['#6366f1', '#22d3ee']

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financeiro</h1>
        <div className="flex gap-2">
          {PERIODOS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriodo(p.value)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                periodo === p.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={load}
            className="px-3 py-1 rounded text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            ↻ Atualizar
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-400">Carregando...</p>}

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI label="Total Recebido" value={fmt(data.totalRecebido)} sub="todos os tempos" />
            <KPI label="MRR Ativo" value={fmt(data.mrrAtivo)} sub={`${data.assinaturasAtivas} assinaturas`} />
            <KPI label="Assinaturas Ativas" value={String(data.assinaturasAtivas)} sub="recorrências ativas" />
            <KPI label="Taxa de Conversão" value={`${data.taxaConversao}%`} sub={`${data.leadsPagantes}/${data.totalLeads} leads`} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPI label="Total de Leads" value={String(data.totalLeads)} sub="cadastrados" />
            <KPI label="Leads Pagantes" value={String(data.leadsPagantes)} sub="conversões" />
            <KPI label="Em Recuperação" value={String(data.leadsRecuperacao)} sub="pagamento pendente" accent />
            <KPI label="À Vista" value={`${data.aVistaCount} · ${fmt(data.aVistaTotal)}`} sub="pagamentos únicos" />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h2 className="text-sm font-semibold mb-4 text-gray-500">Receita por dia</h2>
              {data.graficoReceita.length === 0 ? (
                <p className="text-gray-400 text-sm">Sem dados no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data.graficoReceita}>
                    <defs>
                      <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `R$${(v / 100).toFixed(0)}`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Area type="monotone" dataKey="valor" stroke="#6366f1" fill="url(#colorValor)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h2 className="text-sm font-semibold mb-4 text-gray-500">Distribuição de receita</h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Links módulos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ModuleLink href="/admin/financeiro/pagamentos" title="Pagamentos" desc="Histórico completo de transações" />
            <ModuleLink href="/admin/financeiro/assinaturas" title="Assinaturas" desc="Recorrências e status de cobrança" />
            <ModuleLink href="/admin/financeiro/leads" title="Leads / Funil" desc="Funil de conversão e recuperação" />
          </div>
        </>
      )}
    </div>
  )
}

function KPI({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800' : 'border-gray-200 bg-white dark:bg-gray-900 dark:border-gray-800'}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
    </div>
  )
}

function ModuleLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a
      href={href}
      className="block rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-indigo-400 hover:shadow transition-all"
    >
      <p className="font-semibold mb-1">{title}</p>
      <p className="text-sm text-gray-500">{desc}</p>
    </a>
  )
}
