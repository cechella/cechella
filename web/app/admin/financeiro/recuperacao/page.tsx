'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { ArrowLeft, RefreshCw, AlertTriangle, CreditCard, Repeat, Phone } from 'lucide-react'
import Link from 'next/link'

type LeadRecuperacao = {
  id: string
  nome: string | null
  telefone: string
  status_pagamento: string
  tentativas_pagamento: number
  created_at: string
  ultimo_metodo: string | null
  ultimo_valor: number | null
  pagamentos: { metodo: string; valor: number; status: string; created_at: string }[]
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(s: string) {
  return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function metodoLabel(m: string | null) {
  if (!m) return '—'
  if (m === 'cartao_avista') return 'Cartão à vista'
  if (m === 'cartao_recorrente') return 'Assinatura recorrente'
  if (m === 'pix') return 'PIX'
  return m
}

function statusLabel(s: string) {
  if (s === 'recuperacao_necessaria') return { label: 'Recuperação', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' }
  if (s === 'inadimplente') return { label: 'Inadimplente', color: 'text-red-400 bg-red-500/10 border-red-500/20' }
  return { label: s, color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' }
}

export default function RecuperacaoPage() {
  const [leads, setLeads] = useState<LeadRecuperacao[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/financeiro?tipo=recuperacao')
      const d = await r.json()
      setLeads(d.leads || [])
      setTotal(d.total || 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto space-y-6">

            <div className="flex items-center gap-3">
              <Link href="/admin/financeiro" className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                <ArrowLeft className="w-4 h-4 text-zinc-400" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-white flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Leads em Recuperação
                </h1>
                <p className="text-zinc-500 text-xs mt-0.5">{total} lead{total !== 1 ? 's' : ''} com pagamento pendente ou inadimplente</p>
              </div>
              <button onClick={carregar} className="ml-auto p-2 rounded-lg hover:bg-zinc-800 transition-colors" title="Atualizar">
                <RefreshCw className={`w-4 h-4 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-16 text-zinc-500 text-sm">Carregando...</div>
            ) : leads.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-sm">Nenhum lead em recuperação</div>
            ) : (
              <div className="space-y-3">
                {leads.map(lead => {
                  const st = statusLabel(lead.status_pagamento)
                  return (
                    <div key={lead.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white text-sm">{lead.nome || 'Sem nome'}</span>
                            <span className={`text-[10px] font-medium border px-1.5 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                            <Phone className="w-3 h-3" />
                            <span>{lead.telefone}</span>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-xs text-zinc-500">Tentativas: <span className="text-white font-medium">{lead.tentativas_pagamento || 0}</span></div>
                          <div className="text-xs text-zinc-500">Lead desde: <span className="text-zinc-300">{fmtData(lead.created_at)}</span></div>
                        </div>
                      </div>

                      {/* Último método */}
                      {lead.ultimo_metodo && (
                        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-800/50 rounded-lg px-3 py-2">
                          {lead.ultimo_metodo === 'cartao_recorrente' ? <Repeat className="w-3.5 h-3.5 text-purple-400" /> : <CreditCard className="w-3.5 h-3.5 text-blue-400" />}
                          <span>Último método: <span className="text-white">{metodoLabel(lead.ultimo_metodo)}</span></span>
                          {lead.ultimo_valor != null && (
                            <span className="ml-auto font-medium text-white">{fmtBRL(lead.ultimo_valor)}</span>
                          )}
                        </div>
                      )}

                      {/* Histórico de pagamentos */}
                      {lead.pagamentos.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Histórico</p>
                          <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 overflow-hidden">
                            {lead.pagamentos.map((p, i) => (
                              <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                                <div className="flex items-center gap-2 text-zinc-300">
                                  {p.metodo === 'cartao_recorrente' ? <Repeat className="w-3 h-3 text-purple-400" /> : <CreditCard className="w-3 h-3 text-blue-400" />}
                                  <span>{metodoLabel(p.metodo)}</span>
                                  <span className="text-zinc-600">{fmtData(p.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-white">{fmtBRL(p.valor)}</span>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${p.status === 'approved' ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                                    {p.status === 'approved' ? 'Aprovado' : 'Recusado'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
