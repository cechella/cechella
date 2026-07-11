'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  ArrowLeft, RefreshCw, CheckCircle2, XCircle,
  DollarSign, Zap, Database, MessageSquare, Activity,
} from 'lucide-react'
import Link from 'next/link'

type Servico = { ok: boolean; latencia: number }
type Config = {
  config: {
    valor_avista: number
    valor_recorrente: number
    parcelas: number
    descricao_mp: string
    ambiente: string
  }
  servicos: {
    supabase: Servico
    mercadopago: Servico
    zapi: Servico
  }
  log_webhooks: Array<{
    lead_telefone: string
    payment_id: string
    metodo: string
    valor: number
    status: string
    created_at: string
  }>
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: 'Aprovado', cls: 'bg-green-500/10 text-green-400 border border-green-500/20' },
    pending:  { label: 'Pendente', cls: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' },
    rejected: { label: 'Rejeitado', cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  }
  const cfg = map[status] ?? { label: status, cls: 'bg-zinc-800 text-zinc-400 border border-zinc-700' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

function ServicoCard({
  nome,
  icon,
  servico,
  loading,
}: {
  nome: string
  icon: React.ReactNode
  servico: Servico | undefined
  loading: boolean
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
            {icon}
          </div>
          <span className="text-sm font-medium text-white">{nome}</span>
        </div>
        {loading ? (
          <div className="w-5 h-5 rounded-full bg-zinc-800 animate-pulse" />
        ) : servico?.ok ? (
          <CheckCircle2 className="w-5 h-5 text-green-400" />
        ) : (
          <XCircle className="w-5 h-5 text-red-400" />
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Status</span>
        {loading ? (
          <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
        ) : (
          <span className={`text-xs font-medium ${servico?.ok ? 'text-green-400' : 'text-red-400'}`}>
            {servico?.ok ? 'Online' : 'Offline'}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500">Latência</span>
        {loading ? (
          <div className="h-4 w-12 bg-zinc-800 rounded animate-pulse" />
        ) : (
          <span className="text-xs font-mono text-zinc-300 tabular-nums">
            {servico?.latencia != null ? `${servico.latencia} ms` : '—'}
          </span>
        )}
      </div>
    </div>
  )
}

export default function FinanceiroConfigPage() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [atualizadoEm, setAtualizadoEm] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/financeiro/config')
      const d = await r.json()
      setConfig(d)
      setAtualizadoEm(new Date().toLocaleTimeString('pt-BR'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const webhooks = config?.log_webhooks?.slice(0, 20) ?? []

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/financeiro"
                className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Configurações Financeiro</h1>
                <p className="text-zinc-500 text-sm">Valores ativos, status dos serviços e log de webhooks</p>
              </div>
            </div>
            <button
              onClick={carregar}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              {atualizadoEm ? `Atualizado às ${atualizadoEm}` : 'Atualizar'}
            </button>
          </div>

          {/* Valores Configurados */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
              Valores Configurados
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* À Vista */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 uppercase tracking-wide">À Vista</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    <Zap className="w-3 h-3" />
                    TESTE
                  </span>
                </div>
                {loading ? (
                  <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-white tabular-nums">
                    {config ? fmt(config.config.valor_avista) : 'R$25,00'}
                  </p>
                )}
                <p className="text-xs text-zinc-500">Pagamento único no cartão</p>
              </div>

              {/* Recorrente */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500 uppercase tracking-wide">
                    Recorrente ({config?.config.parcelas ?? 6}x)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    <Zap className="w-3 h-3" />
                    TESTE
                  </span>
                </div>
                {loading ? (
                  <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
                ) : (
                  <p className="text-2xl font-bold text-white tabular-nums">
                    {config ? fmt(config.config.valor_recorrente) : 'R$5,00'}
                    <span className="text-sm font-normal text-zinc-500">/mês</span>
                  </p>
                )}
                <p className="text-xs text-zinc-500">Cobrança mensal recorrente</p>
              </div>
            </div>

            {/* Nota */}
            <div className="flex items-start gap-2.5 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <Activity className="w-4 h-4 text-zinc-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-zinc-500 leading-relaxed">
                Para alterar para produção{' '}
                <span className="text-zinc-300">(R$5.000 / R$833)</span>, edite o arquivo{' '}
                <code className="font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                  web/app/api/pagar/route.ts
                </code>
              </p>
            </div>
          </section>

          {/* Status dos Serviços */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
              Status dos Serviços
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <ServicoCard
                nome="Supabase"
                icon={<Database className="w-4 h-4" />}
                servico={config?.servicos.supabase}
                loading={loading}
              />
              <ServicoCard
                nome="MercadoPago"
                icon={<DollarSign className="w-4 h-4" />}
                servico={config?.servicos.mercadopago}
                loading={loading}
              />
              <ServicoCard
                nome="Z-API WhatsApp"
                icon={<MessageSquare className="w-4 h-4" />}
                servico={config?.servicos.zapi}
                loading={loading}
              />
            </div>
          </section>

          {/* Log de Pagamentos */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                Log de Pagamentos
              </h2>
              <span className="text-xs text-zinc-600">Últimas 20 entradas</span>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                        Data / Hora
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                        Telefone
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                        Método
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                        Valor
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wide whitespace-nowrap">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && webhooks.length === 0 ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-zinc-800/50">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${60 + (j * 13) % 40}%` }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : webhooks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-zinc-600 text-sm">
                          Nenhum webhook registrado
                        </td>
                      </tr>
                    ) : (
                      webhooks.map((w, i) => (
                        <tr
                          key={i}
                          className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs text-zinc-400 font-mono tabular-nums whitespace-nowrap">
                            {fmtDateTime(w.created_at)}
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-300 font-mono tabular-nums whitespace-nowrap">
                            {w.lead_telefone}
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                            {w.metodo}
                          </td>
                          <td className="px-4 py-3 text-xs text-zinc-300 text-right font-mono tabular-nums whitespace-nowrap">
                            {fmt(w.valor)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={w.status} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  )
}
