'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2,
  XCircle, Clock, Repeat, Copy, ExternalLink,
  MessageSquare, CheckCheck, Ban,
} from 'lucide-react'
import Link from 'next/link'

type Assinatura = {
  id: string
  created_at: string
  lead_id: string
  lead_telefone: string
  nome: string | null
  preapproval_id: string
  valor: number
  parcelas_pagas: number
  parcelas_total: number
  proxima_cobranca: string | null
  status: string
  payment_method_id: string | null
  issuer_id: string | null
}

type StatusInfo = {
  label: string
  color: string
  icon: React.ReactNode
  alerta?: string
}

function getStatusInfo(a: Assinatura): StatusInfo {
  const hoje = new Date()

  if (a.status === 'concluido' || a.parcelas_pagas >= a.parcelas_total) {
    return {
      label: 'Concluído',
      color: 'text-green-400 bg-green-500/10 border-green-500/20',
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    }
  }

  if (a.status === 'cancelado') {
    return {
      label: 'Cancelado',
      color: 'text-red-400 bg-red-500/10 border-red-500/20',
      icon: <XCircle className="w-3.5 h-3.5" />,
      alerta: 'vermelho',
    }
  }

  if (a.proxima_cobranca) {
    const proxima = new Date(a.proxima_cobranca)
    const diasAtraso = Math.floor((hoje.getTime() - proxima.getTime()) / (1000 * 60 * 60 * 24))
    if (diasAtraso > 35) {
      return {
        label: 'Inadimplente',
        color: 'text-red-400 bg-red-500/10 border-red-500/20',
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        alerta: 'vermelho',
      }
    }
    if (diasAtraso > 0) {
      return {
        label: 'Atrasado',
        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        alerta: 'amarelo',
      }
    }
  }

  // Verificar divergência parcelas esperadas vs pagas
  if (a.created_at) {
    const inicio = new Date(a.created_at)
    const mesesDecorridos = Math.floor(
      (hoje.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 30)
    )
    const parcelasEsperadas = Math.min(mesesDecorridos + 1, a.parcelas_total)
    if (a.parcelas_pagas < parcelasEsperadas - 1) {
      return {
        label: 'Revisar',
        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        alerta: 'amarelo',
      }
    }
  }

  return {
    label: 'Ativo',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    icon: <Repeat className="w-3.5 h-3.5" />,
  }
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(iso: string | null, hora = false) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!hora) return d.toLocaleDateString('pt-BR')
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function ProgressBar({ pagas, total }: { pagas: number; total: number }) {
  const pct = Math.min(100, Math.round((pagas / total) * 100))
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-purple-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400 whitespace-nowrap">{pagas}/{total}</span>
    </div>
  )
}

const FILTROS = [
  { label: 'Todos', value: '' },
  { label: 'Ativos', value: 'ativo' },
  { label: 'Concluídos', value: 'concluido' },
  { label: 'Cancelados', value: 'cancelado' },
]

export default function AssinaturasPage() {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [atualizadoEm, setAtualizadoEm] = useState('')
  const [loadingAcao, setLoadingAcao] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/financeiro/assinaturas')
      const d = await r.json()
      setAssinaturas(d.assinaturas || [])
      setAtualizadoEm(new Date().toLocaleTimeString('pt-BR'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function copiar(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
  }

  async function executarAcao(action: string, id: string, telefone: string, nome: string | null) {
    setLoadingAcao(id + action)
    try {
      const r = await fetch('/api/admin/financeiro/assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id, telefone, nome }),
      })
      const d = await r.json()
      if (r.ok) {
        await carregar()
        setFeedback(d.message || 'Ação executada com sucesso.')
      } else {
        setFeedback(d.error || 'Erro ao executar ação.')
      }
    } catch {
      setFeedback('Erro de conexão ao executar ação.')
    } finally {
      setLoadingAcao(null)
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  const lista = filtro
    ? assinaturas.filter(a => {
        if (filtro === 'concluido') return a.status === 'concluido' || a.parcelas_pagas >= a.parcelas_total
        if (filtro === 'cancelado') return a.status === 'cancelado'
        if (filtro === 'ativo') return a.status === 'ativo' && a.parcelas_pagas < a.parcelas_total
        return true
      })
    : assinaturas

  const alertasVermelho = assinaturas.filter(a => getStatusInfo(a).alerta === 'vermelho').length
  const alertasAmarelo = assinaturas.filter(a => getStatusInfo(a).alerta === 'amarelo').length
  const ativas = assinaturas.filter(a => a.status === 'ativo' && a.parcelas_pagas < a.parcelas_total).length
  const concluidas = assinaturas.filter(a => a.status === 'concluido' || a.parcelas_pagas >= a.parcelas_total).length

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Feedback toast */}
          {feedback && (
            <div className="fixed top-4 right-4 z-50 bg-zinc-800 border border-zinc-700 text-white text-sm px-4 py-3 rounded-xl shadow-lg max-w-sm">
              {feedback}
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/financeiro" className="text-zinc-500 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Assinaturas Recorrentes</h1>
                <p className="text-zinc-500 text-sm">{assinaturas.length} assinaturas no total</p>
              </div>
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

          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Ativas</p>
              <p className="text-2xl font-bold text-blue-400">{ativas}</p>
              <p className="text-zinc-600 text-xs mt-1">Em andamento</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Concluídas</p>
              <p className="text-2xl font-bold text-green-400">{concluidas}</p>
              <p className="text-zinc-600 text-xs mt-1">6/6 parcelas pagas</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Alertas</p>
              <p className="text-2xl font-bold text-yellow-400">{alertasAmarelo}</p>
              <p className="text-zinc-600 text-xs mt-1">Revisão necessária</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-zinc-500 text-xs uppercase tracking-wide mb-2">Críticos</p>
              <p className="text-2xl font-bold text-red-400">{alertasVermelho}</p>
              <p className="text-zinc-600 text-xs mt-1">Cancelados / Inadimplentes</p>
            </div>
          </div>

          {/* Alertas */}
          {(alertasVermelho > 0 || alertasAmarelo > 0) && (
            <div className="space-y-2">
              {alertasVermelho > 0 && (
                <div className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                  <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-sm text-red-300">
                    <span className="font-semibold">{alertasVermelho} assinatura{alertasVermelho > 1 ? 's' : ''}</span>
                    {' '}com alerta crítico — cancelada ou inadimplente há mais de 35 dias.
                  </p>
                </div>
              )}
              {alertasAmarelo > 0 && (
                <div className="flex items-center gap-3 bg-yellow-500/5 border border-yellow-500/20 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <p className="text-sm text-yellow-300">
                    <span className="font-semibold">{alertasAmarelo} assinatura{alertasAmarelo > 1 ? 's' : ''}</span>
                    {' '}com divergência de parcelas ou atraso — revisar manualmente.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Filtros */}
          <div className="flex bg-zinc-800 rounded-lg p-0.5 w-fit">
            {FILTROS.map(f => (
              <button
                key={f.value}
                onClick={() => setFiltro(f.value)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  filtro === f.value
                    ? 'bg-purple-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tabela */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Data</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Lead</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide w-40">Progresso</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Próx. Cobrança</th>
                    <th className="text-right px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Valor/mês</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Preapproval ID</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-zinc-800/50">
                        {Array.from({ length: 7 }).map((_, j) => (
                          <td key={j} className="px-4 py-4">
                            <div className="h-4 bg-zinc-800 rounded animate-pulse" style={{ width: `${50 + j * 8}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : lista.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-zinc-600">
                        Nenhuma assinatura encontrada
                      </td>
                    </tr>
                  ) : (
                    lista.map(a => {
                      const si = getStatusInfo(a)
                      return (
                        <tr
                          key={a.id}
                          className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${
                            si.alerta === 'vermelho' ? 'bg-red-500/3' : si.alerta === 'amarelo' ? 'bg-yellow-500/3' : ''
                          }`}
                        >
                          <td className="px-4 py-4 text-zinc-400 text-xs whitespace-nowrap">
                            {a.created_at ? fmtData(a.created_at, true) : '—'}
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-medium text-white text-sm">{a.nome || '—'}</div>
                            <div className="text-zinc-500 text-xs">{a.lead_telefone}</div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${si.color}`}>
                              {si.icon}
                              {si.label}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <ProgressBar pagas={a.parcelas_pagas} total={a.parcelas_total} />
                          </td>
                          <td className="px-4 py-4 text-zinc-400 text-xs whitespace-nowrap">
                            {a.proxima_cobranca ? fmtData(a.proxima_cobranca) : '—'}
                          </td>
                          <td className="px-4 py-4 text-right font-semibold text-white whitespace-nowrap">
                            {fmt(a.valor)}
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-zinc-500 text-xs font-mono">
                              {a.preapproval_id ? `${a.preapproval_id.toString().slice(0, 10)}…` : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {a.preapproval_id && (
                                <button
                                  onClick={() => copiar(a.preapproval_id)}
                                  className="text-zinc-500 hover:text-white transition-colors"
                                  title="Copiar Preapproval ID"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => executarAcao('enviar_lembrete', a.id, a.lead_telefone, a.nome)}
                                disabled={loadingAcao === a.id + 'enviar_lembrete'}
                                className="text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
                                title="Enviar lembrete WhatsApp"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => executarAcao('marcar_pago', a.id, a.lead_telefone, a.nome)}
                                disabled={loadingAcao === a.id + 'marcar_pago' || a.parcelas_pagas >= a.parcelas_total}
                                className="text-green-400 hover:text-green-300 disabled:opacity-40 transition-colors"
                                title="Marcar parcela paga"
                              >
                                <CheckCheck className="w-3.5 h-3.5" />
                              </button>
                              {a.status !== 'cancelado' && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Cancelar assinatura de ${a.nome || a.lead_telefone}?`)) {
                                      executarAcao('cancelar', a.id, a.lead_telefone, a.nome)
                                    }
                                  }}
                                  disabled={loadingAcao === a.id + 'cancelar'}
                                  className="text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors"
                                  title="Cancelar assinatura"
                                >
                                  <Ban className="w-3.5 h-3.5" />
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

            {!loading && lista.length > 0 && (
              <div className="px-4 py-3 border-t border-zinc-800">
                <p className="text-zinc-600 text-xs">{lista.length} registro{lista.length !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
