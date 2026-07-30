// [SYNC] Gerado automaticamente de admin/financeiro — NÃO editar manualmente
// Para atualizar: Admin → Sistema → Sincronizar
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  DollarSign, TrendingUp, Users, RefreshCw,
  CreditCard, Repeat, AlertTriangle, CheckCircle2,
  ArrowUpRight, XCircle, Zap,
} from 'lucide-react'
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
  pixCount: number
  pixTotal: number
  recusadosCount: number
  recusadosTotal: number
  graficoReceita: { data: string; valor: number }[]
}

const PERIODO_OPTS = [
  { label: '7 dias', value: '7' },
  { label: '30 dias', value: '30' },
  { label: '90 dias', value: '90' },
]

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function KpiCard({
  icon, label, value, sub, color = 'purple', href, accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color?: string
  href?: string
  accent?: string
}) {
  const colors: Record<string, string> = {
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  }
  const topLine: Record<string, string> = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    sky: 'bg-sky-500',
  }
  const inner = (
    <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3 hover:border-zinc-700 transition-all group overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${topLine[color]}`} />
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-zinc-500 text-[10px] font-semibold uppercase tracking-widest mb-1.5">{label}</p>
        <p className={`text-2xl font-bold font-mono ${accent || 'text-white'}`}>{value}</p>
        {sub && <p className="text-zinc-500 text-xs mt-1">{sub}</p>}
      </div>
      {href && (
        <div className="flex items-center gap-1 text-purple-400 text-xs mt-auto group-hover:text-purple-300 transition-colors">
          <ArrowUpRight className="w-3 h-3" />
          <span>Ver detalhes</span>
        </div>
      )}
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}

function FunnelBar({ label, value, total, color, pct }: { label: string; value: number; total: number; color: string; pct?: string }) {
  const width = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-zinc-400 font-medium">{label}</span>
        <span className="text-xs font-bold text-white font-mono">{value}</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${width}%` }} />
      </div>
      {pct && <p className="text-[10px] text-zinc-600">{pct}</p>}
    </div>
  )
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

  const totalTentativas = resumo ? (resumo.aVistaCount + resumo.recusadosCount) : 0
  const taxaAprovacao = totalTentativas > 0 ? Math.round((resumo!.aVistaCount / totalTentativas) * 100) : 0

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* HEADER */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-bold text-white">Painel Financeiro</h1>
                <div className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-2.5 py-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-[10px] font-semibold text-green-400 uppercase tracking-wide">Ao vivo</span>
                </div>
              </div>
              <p className="text-zinc-500 text-sm">
                {atualizadoEm ? `Atualizado às ${atualizadoEm}` : 'Visão geral de receita e conversão'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                {PERIODO_OPTS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => setPeriodo(o.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      periodo === o.value
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-white'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <button
                onClick={carregar}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors border border-zinc-800 rounded-lg px-3 py-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>
          </div>

          {loading && !resumo ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 h-32 animate-pulse" />
              ))}
            </div>
          ) : resumo && (
            <>
              {/* KPI ROW 1 — principais */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3 flex items-center gap-2">
                  Visão geral · {periodo} dias
                  <span className="flex-1 h-px bg-zinc-800" />
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <KpiCard
                    icon={<DollarSign className="w-4 h-4" />}
                    label="Receita Total"
                    value={fmt(resumo.totalRecebido)}
                    sub={`${resumo.aVistaCount + resumo.recorrenteCount + resumo.pixCount} transações aprovadas`}
                    color="purple"
                  />
                  <KpiCard
                    icon={<Repeat className="w-4 h-4" />}
                    label="MRR Recorrência"
                    value={fmt(resumo.mrrAtivo)}
                    sub={`${resumo.assinaturasAtivas} assinaturas ativas`}
                    color="blue"
                    href="/medical/financeiro/assinaturas"
                  />
                  <KpiCard
                    icon={<TrendingUp className="w-4 h-4" />}
                    label="Taxa de Conversão"
                    value={`${resumo.taxaConversao}%`}
                    sub={`${resumo.leadsPagantes} de ${resumo.totalLeads} leads`}
                    color="green"
                  />
                  <KpiCard
                    icon={<XCircle className="w-4 h-4" />}
                    label="À Vista Recusados"
                    value={String(resumo.recusadosCount)}
                    sub={`${fmt(resumo.recusadosTotal)} · tx. apr. ${taxaAprovacao}%`}
                    color="red"
                    accent="text-red-400"
                    href="/medical/financeiro/pagamentos?status=rejected"
                  />
                </div>
              </div>

              {/* KPI ROW 2 — métodos */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3 flex items-center gap-2">
                  Por método
                  <span className="flex-1 h-px bg-zinc-800" />
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <KpiCard
                    icon={<CreditCard className="w-4 h-4" />}
                    label="À Vista Aprovados"
                    value={String(resumo.aVistaCount)}
                    sub={fmt(resumo.aVistaTotal)}
                    color="green"
                    href="/medical/financeiro/pagamentos?metodo=cartao_avista"
                  />
                  <KpiCard
                    icon={<Repeat className="w-4 h-4" />}
                    label="Parcelas Recorrentes"
                    value={String(resumo.recorrenteCount)}
                    sub={fmt(resumo.recorrenteTotal)}
                    color="blue"
                    href="/medical/financeiro/pagamentos?metodo=cartao_recorrente"
                  />
                  <KpiCard
                    icon={<Zap className="w-4 h-4" />}
                    label="PIX Aprovados"
                    value={String(resumo.pixCount)}
                    sub={fmt(resumo.pixTotal)}
                    color="sky"
                    href="/medical/financeiro/pagamentos?metodo=pix"
                  />
                  <KpiCard
                    icon={<AlertTriangle className="w-4 h-4" />}
                    label="Em Recuperação"
                    value={String(resumo.leadsRecuperacao)}
                    sub="Leads sem pagamento"
                    color="yellow"
                    href="/medical/financeiro/recuperacao"
                  />
                </div>
              </div>

              {/* GRÁFICO + FUNIL */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Receita por dia */}
                <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Receita por Dia</h2>
                      <p className="text-zinc-600 text-xs mt-0.5">Pagamentos aprovados no período</p>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-purple-500 inline-block" />Total</span>
                    </div>
                  </div>
                  {resumo.graficoReceita.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={resumo.graficoReceita}>
                        <defs>
                          <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f1f28" vertical={false} />
                        <XAxis dataKey="data" tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: '#52525b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} width={44} />
                        <Tooltip
                          contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: '#a1a1aa' }}
                          formatter={(v: number) => [fmt(v), 'Receita']}
                        />
                        <Area type="monotone" dataKey="valor" stroke="#a855f7" strokeWidth={2} fill="url(#colorValor)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-zinc-600 text-sm">
                      Sem dados neste período
                    </div>
                  )}
                </div>

                {/* Funil de conversão */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                  <div className="mb-4">
                    <h2 className="text-sm font-semibold text-white">Funil de Conversão</h2>
                    <p className="text-zinc-600 text-xs mt-0.5">Do lead ao pagamento</p>
                  </div>
                  <div className="flex flex-col gap-4">
                    <FunnelBar
                      label="Leads no sistema"
                      value={resumo.totalLeads}
                      total={resumo.totalLeads}
                      color="bg-zinc-500"
                      pct="100% — base total"
                    />
                    <FunnelBar
                      label="Pagantes (qualquer método)"
                      value={resumo.leadsPagantes}
                      total={resumo.totalLeads}
                      color="bg-purple-500"
                      pct={`${resumo.taxaConversao}% do total`}
                    />
                    <FunnelBar
                      label="PIX aprovados"
                      value={resumo.pixCount}
                      total={resumo.totalLeads}
                      color="bg-sky-500"
                      pct={`${resumo.totalLeads > 0 ? Math.round(resumo.pixCount / resumo.totalLeads * 100) : 0}% do total`}
                    />
                    <FunnelBar
                      label="Cartão à vista aprovado"
                      value={resumo.aVistaCount}
                      total={resumo.totalLeads}
                      color="bg-green-500"
                      pct={`Taxa apr. cartão: ${taxaAprovacao}%`}
                    />
                    <FunnelBar
                      label="Assinatura 6x gerada"
                      value={resumo.assinaturasAtivas}
                      total={resumo.totalLeads}
                      color="bg-blue-500"
                      pct="Após recusa R$25"
                    />

                    <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wide font-semibold">Recusados cartão</span>
                      <span className="text-sm font-bold text-red-400 font-mono">{resumo.recusadosCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* LINKS */}
              <div className="flex items-center justify-between pt-1">
                <Link
                  href="/medical/financeiro/leads"
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  Ver funil de leads
                </Link>
                <Link
                  href="/medical/financeiro/pagamentos"
                  className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Ver todos os pagamentos
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
