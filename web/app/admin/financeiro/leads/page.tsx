'use client'

import { useEffect, useState, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  ArrowLeft, RefreshCw, Search, Users,
  CheckCircle2, AlertTriangle, Clock, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

type Lead = {
  id: string
  nome: string | null
  telefone: string
  status_pagamento: string | null
  tentativas_pagamento: number
  created_at: string
  etapa: number | null
}

type Funil = {
  cadastrados: number
  tentaram: number
  pagos: number
}

const FILTROS = [
  { label: 'Todos', value: '' },
  { label: 'Pagos', value: 'pago' },
  { label: 'Em Recuperação', value: 'recuperacao' },
  { label: 'Sem tentativa', value: 'sem_tentativa' },
]

function statusInfo(s: string | null) {
  if (s === 'pago' || s === 'aprovado') return { label: 'Pago', color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: <CheckCircle2 className="w-3 h-3" /> }
  if (s === 'recuperacao_necessaria') return { label: 'Recuperação', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: <AlertTriangle className="w-3 h-3" /> }
  if (!s || s === 'pendente') return { label: 'Pendente', color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20', icon: <Clock className="w-3 h-3" /> }
  return { label: s, color: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20', icon: <Clock className="w-3 h-3" /> }
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function FunilBar({ funil }: { funil: Funil }) {
  const pctTentaram = funil.cadastrados > 0 ? Math.round((funil.tentaram / funil.cadastrados) * 100) : 0
  const pctPagos = funil.cadastrados > 0 ? Math.round((funil.pagos / funil.cadastrados) * 100) : 0

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-5">Funil de Conversão</h2>
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="text-center">
          <p className="text-3xl font-bold text-white">{funil.cadastrados}</p>
          <p className="text-xs text-zinc-500 mt-1">Cadastrados</p>
          <p className="text-xs text-zinc-600">100%</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-blue-400">{funil.tentaram}</p>
          <p className="text-xs text-zinc-500 mt-1">Tentaram pagar</p>
          <p className="text-xs text-zinc-600">{pctTentaram}%</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-green-400">{funil.pagos}</p>
          <p className="text-xs text-zinc-500 mt-1">Pagos</p>
          <p className="text-xs text-zinc-600">{pctPagos}%</p>
        </div>
      </div>

      {/* Barras */}
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>Cadastrados</span><span>100%</span>
          </div>
          <div className="h-2 bg-zinc-700 rounded-full">
            <div className="h-2 bg-purple-500 rounded-full w-full" />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>Tentaram pagar</span><span>{pctTentaram}%</span>
          </div>
          <div className="h-2 bg-zinc-700 rounded-full">
            <div className="h-2 bg-blue-500 rounded-full transition-all" style={{ width: `${pctTentaram}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>Pagos</span><span>{pctPagos}%</span>
          </div>
          <div className="h-2 bg-zinc-700 rounded-full">
            <div className="h-2 bg-green-500 rounded-full transition-all" style={{ width: `${pctPagos}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [funil, setFunil] = useState<Funil>({ cadastrados: 0, tentaram: 0, pagos: 0 })
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [busca, setBusca] = useState('')
  const [buscaInput, setBuscaInput] = useState('')
  const [page, setPage] = useState(1)
  const [atualizadoEm, setAtualizadoEm] = useState('')
  const limit = 25

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(filtro && { filtro }),
        ...(busca && { busca }),
      })
      const r = await fetch(`/api/admin/financeiro/leads?${params}`)
      const d = await r.json()
      setLeads(d.leads || [])
      setTotal(d.total || 0)
      setFunil(d.funil || { cadastrados: 0, tentaram: 0, pagos: 0 })
      setAtualizadoEm(new Date().toLocaleTimeString('pt-BR'))
    } finally {
      setLoading(false)
    }
  }, [page, filtro, busca])

  useEffect(() => { carregar() }, [carregar])

  const totalPages = Math.ceil(total / limit)

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
                <h1 className="text-xl font-bold text-white">Leads e Funil</h1>
                <p className="text-zinc-500 text-sm">{total} leads encontrados</p>
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

          {/* Funil */}
          <FunilBar funil={funil} />

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Busca */}
            <form
              onSubmit={e => { e.preventDefault(); setBusca(buscaInput); setPage(1) }}
              className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-3 gap-2 h-9"
            >
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <input
                className="bg-transparent text-sm text-white placeholder-zinc-600 outline-none w-44"
                placeholder="Nome ou telefone..."
                value={buscaInput}
                onChange={e => setBuscaInput(e.target.value)}
              />
            </form>

            {/* Status */}
            <div className="flex bg-zinc-800 rounded-lg p-0.5">
              {FILTROS.map(f => (
                <button
                  key={f.value}
                  onClick={() => { setFiltro(f.value); setPage(1) }}
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
          </div>

          {/* Tabela */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Lead</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Status</th>
                  <th className="text-center px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Tentativas</th>
                  <th className="text-center px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Etapa</th>
                  <th className="text-left px-4 py-3 text-zinc-500 font-medium text-xs uppercase tracking-wide">Cadastro</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {loading && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">Carregando...</td></tr>
                )}
                {!loading && leads.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">Nenhum lead encontrado</td></tr>
                )}
                {leads.map(l => {
                  const st = statusInfo(l.status_pagamento)
                  return (
                    <tr key={l.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{l.nome || '—'}</p>
                        <p className="text-zinc-500 text-xs">{l.telefone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${st.color}`}>
                          {st.icon}{st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-semibold ${l.tentativas_pagamento > 0 ? 'text-blue-400' : 'text-zinc-600'}`}>
                          {l.tentativas_pagamento}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full">
                          {l.etapa ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs">{fmtData(l.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/crm?telefone=${l.telefone}`}
                          className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          CRM
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex gap-2 justify-end">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded border border-zinc-700 text-sm text-zinc-400 disabled:opacity-40 hover:text-white transition-colors"
              >
                ← Anterior
              </button>
              <span className="px-3 py-1 text-sm text-zinc-500">{page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded border border-zinc-700 text-sm text-zinc-400 disabled:opacity-40 hover:text-white transition-colors"
              >
                Próxima →
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
