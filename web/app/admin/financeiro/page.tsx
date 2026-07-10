'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  DollarSign, TrendingUp, Users, RefreshCw,
  CreditCard, Repeat, AlertTriangle, CheckCircle2,
  ArrowUpRight,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import Link from 'next/link'

type Resumo = {
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

const PERIODO_OPTS = [
  { label: '7 dias', value: '7' },
  { label: '30 dias', value: '30' },
  { label: '90 dias', value: '90' },
]

const PIE_COLORS = ['#a855f7', '#3b82f6', '#22c55e']

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function KpiCard({
  icon, label, value, sub, color = 'purple', href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color?: string
  href?: string
}) {
  const colors: Record<string, string> = {
    purple: 'bg-purple-500/10 text-purple-400',
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    red: 'bg-red-500/10 text-red-400',
  }
  const inner = (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3 hover:border-zinc-700 transition-colors">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-zinc-500 text-xs uppercase tracking-wide mb-1">{label}</p>
        <p className="text-white text-2xl font-bold">{value}</p>
        {sub && <p className="text-zinc-500 text-xs mt-1">{sub}</p>}
      </div>
      {href && (
        <div className="flex items-center gap-1 text-purple-400 text-xs mt-auto">
          <ArrowUpRight className="w-3 h-3" />
          <span>Ver detalhes</span>
        </div>
      )}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

export default function FinanceiroDashboard() {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [periodo, setPeriodo] = useState('30')
  const [loading, setLoading] = useState(true)
  const [atualizadoEm, setAtualizadoEm] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/admin/financeiro?tipo=resumo&periodo=${periodo}`)
      const d = await r.json()
      setResumo(d)
      setAtualizadoEm(new Date().toLocaleTimeString('pt-BR'))
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => { carregar() }, [carregar])

  const pieData = resumo ? [
    { name: 'À Vista', value: resumo.aVistaTotal },
    { name: 'Recorrente', value: resumo.recorrenteTotal },
  ].filter(d => d.value > 0) : []

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Painel Financeiro</h1>
              <p className="text-zinc-500 text-sm">Visão geral de receita, assinaturas e conversão</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-zinc-800 rounded-lg p-0.5">
                {PERIODO_OPTS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setPeriodo(o.value)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      periodo === o.value
                        ? 'bg-purple-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <button
                onClick={carregar}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                {atualizadoEm || 'Atualizar'}
              </button>
            </div>
          </div>

          {/* KPIs */}
          {loading && !resumo ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-32 animate-pulse" />
              ))}
            </div>
          ) : resumo && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  icon={<DollarSign className="w-5 h-5" />}
                  label="Total Recebido"
                  value={fmt(resumo.totalRecebido)}
                  sub={`${resumo.aVistaCount + resumo.recorrenteCount} transações`}
                  color="purple"
                />
                <KpiCard
                  icon={<Repeat className="w-5 h-5" />}
                  label="MRR (Recorrência)"
                  value={fmt(resumo.mrrAtivo)}
                  sub={`${resumo.assinaturasAtivas} assinaturas ativas`}
                  color="blue"
                />
                <KpiCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  label="Taxa de Conversão"
                  value={`${resumo.taxaConversao}%`}
                  sub={`${resumo.leadsPagantes} de ${resumo.totalLeads} leads`}
                  color="green"
                />
                <KpiCard
                  icon={<AlertTriangle className="w-5 h-5" />}
                  label="Em Recuperação"
                  value={String(resumo.leadsRecuperacao)}
                  sub="Leads sem pagamento"
                  color="yellow"
                />
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  icon={<CreditCard className="w-5 h-5" />}
                  label="À Vista Aprovados"
                  value={String(resumo.aVistaCount)}
                  sub={fmt(resumo.aVistaTotal)}
                  color="green"
                  href="/admin/financeiro/pagamentos?metodo=cartao_avista"
                />
                <KpiCard
                  icon={<Repeat className="w-5 h-5" />}
                  label="Parcelas Recorrentes"
                  value={String(resumo.recorrenteCount)}
                  sub={fmt(resumo.recorrenteTotal)}
                  color="blue"
                  href="/admin/financeiro/pagamentos?metodo=cartao_recorrente"
                />
                <KpiCard
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  label="Leads Pagantes"
                  value={String(resumo.leadsPagantes)}
                  sub="Total acumulado"
                  color="green"
                />
                <KpiCard
                  icon={<Users className="w-5 h-5" />}
                  label="Total de Leads"
                  value={String(resumo.totalLeads)}
                  sub="No sistema"
                  color="purple"
                />
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Receita por dia */}
                <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-white mb-4">Receita por Dia</h2>
                  {resumo.graficoReceita.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={resumo.graficoReceita}>
                        <defs>
                          <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="data" tick={{ fill: '#71717a', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                        <Tooltip
                          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }}
                          labelStyle={{ color: '#a1a1aa' }}
                          formatter={(v: number) => [fmt(v), 'Receita']}
                        />
                        <Area type="monotone" dataKey="valor" stroke="#a855f7" strokeWidth={2} fill="url(#colorValor)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-zinc-600 text-sm">
                      Sem dados neste período
                    </div>
                  )}
                </div>

                {/* Distribuição dos métodos */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-white mb-4">Distribuição por Método</h2>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="45%"
                          outerRadius={75}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                          labelLine={false}
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-zinc-600 text-sm">
                      Sem dados
                    </div>
                  )}
                </div>
              </div>

              {/* Links para módulos */}
              <div className="flex items-center justify-between">
                <Link
                  href="/admin/financeiro/leads"
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ArrowUpRight className="w-4 h-4" />
                  Ver funil de leads
                </Link>
                <Link
                  href="/admin/financeiro/pagamentos"
                  className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Ver todos os pagamentos
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
