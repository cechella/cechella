'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import { TrendingUp, Users, Share2, Flame, Clock, RefreshCw } from 'lucide-react'

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null
function getSupabase() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseClient
}

const ETAPAS = [
  { n: 1, label: 'Apresentação' },
  { n: 2, label: 'Conexão' },
  { n: 3, label: 'D.I.' },
  { n: 4, label: 'Speech' },
  { n: 5, label: 'Fechamento' },
  { n: 6, label: 'Referidos' },
  { n: 7, label: 'Validação' },
]

interface FunilData {
  etapa_agente: number
  count: number
}

interface LeadQuente {
  id: string
  nome: string | null
  telefone: string
  etapa_agente: number | null
  updated_at: string
}

interface ReferidosData {
  total: number
  leadsComReferidos: number
}

interface Etapa7Counts {
  hoje: number
  semana: number
  mes: number
}

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  return new Date(ts).toLocaleDateString('pt-BR')
}

function startOf(unit: 'day' | 'week' | 'month'): string {
  const now = new Date()
  if (unit === 'day') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  }
  if (unit === 'week') {
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(now.getFullYear(), now.getMonth(), diff).toISOString()
  }
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

export default function ResultadosPage() {
  const [funilData, setFunilData] = useState<FunilData[]>([])
  const [etapa7, setEtapa7] = useState<Etapa7Counts>({ hoje: 0, semana: 0, mes: 0 })
  const [referidos, setReferidos] = useState<ReferidosData>({ total: 0, leadsComReferidos: 0 })
  const [leadsQuentes, setLeadsQuentes] = useState<LeadQuente[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchAll = useCallback(async () => {
    const supabase = getSupabase()

    const [funilRes, etapa7AllRes, referidosRes, quentesRes] = await Promise.all([
      supabase.from('leads').select('etapa_agente').not('etapa_agente', 'is', null),
      supabase.from('leads').select('updated_at').eq('etapa_agente', 7),
      supabase.from('contatos_referidos').select('indicado_por_telefone'),
      supabase
        .from('leads')
        .select('id, nome, telefone, etapa_agente, updated_at')
        .eq('temperatura', 'quente')
        .order('updated_at', { ascending: true })
        .limit(20),
    ])

    if (funilRes.data) {
      const counts: Record<number, number> = {}
      for (const row of funilRes.data as { etapa_agente: number }[]) {
        counts[row.etapa_agente] = (counts[row.etapa_agente] || 0) + 1
      }
      setFunilData(ETAPAS.map(e => ({ etapa_agente: e.n, count: counts[e.n] || 0 })))
    }

    if (etapa7AllRes.data) {
      const rows = etapa7AllRes.data as { updated_at: string }[]
      const diaInicio = startOf('day')
      const semanaInicio = startOf('week')
      const mesInicio = startOf('month')
      setEtapa7({
        hoje: rows.filter(r => r.updated_at >= diaInicio).length,
        semana: rows.filter(r => r.updated_at >= semanaInicio).length,
        mes: rows.filter(r => r.updated_at >= mesInicio).length,
      })
    }

    if (referidosRes.data) {
      const rows = referidosRes.data as { indicado_por_telefone: string | null }[]
      const distintos = new Set<string>(rows.map(r => r.indicado_por_telefone).filter((x): x is string => Boolean(x)))
      setReferidos({ total: rows.length, leadsComReferidos: distintos.size })
    }

    if (quentesRes.data) {
      setLeadsQuentes(quentesRes.data as LeadQuente[])
    }

    setLastUpdate(new Date())
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAll()
    const interval = setInterval(fetchAll, 30000)
    return () => clearInterval(interval)
  }, [fetchAll])

  const maxCount = Math.max(...funilData.map(d => d.count), 1)

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Resultados — Painel de Performance" />

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-[#71717A]">
                  Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')} · auto-refresh a cada 30s
                </p>
                <button
                  onClick={fetchAll}
                  className="flex items-center gap-2 text-xs text-[#71717A] hover:text-white px-3 py-1.5 rounded-lg hover:bg-[#1C1C1E] transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Atualizar
                </button>
              </div>

              {/* Seção 1: Funil Visual */}
              <section className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-5 h-5 text-[#7B3FE4]" />
                  <h2 className="text-base font-semibold text-white">Funil Visual — Leads por Etapa</h2>
                </div>
                <div className="space-y-3">
                  {funilData.map((item) => {
                    const etapa = ETAPAS.find(e => e.n === item.etapa_agente)
                    const pct = (item.count / maxCount) * 100
                    const isLast = item.etapa_agente === 7
                    return (
                      <div key={item.etapa_agente} className="flex items-center gap-4">
                        <div className="w-24 flex-shrink-0 flex items-center gap-2">
                          <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isLast ? 'bg-green-500/20 text-green-400' : 'bg-[#1C1C1E] text-[#71717A]'
                          }`}>
                            {item.etapa_agente}
                          </span>
                          <span className={`text-xs truncate ${isLast ? 'text-green-400 font-medium' : 'text-[#A1A1AA]'}`}>
                            {etapa?.label}
                          </span>
                        </div>
                        <div className="flex-1 h-7 bg-[#1C1C1E] rounded-lg overflow-hidden">
                          <div
                            className={`h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-3 ${
                              isLast
                                ? 'bg-gradient-to-r from-green-900/60 to-green-600/60 border border-green-500/30'
                                : 'bg-gradient-to-r from-[#7B3FE4]/40 to-[#7B3FE4]/20'
                            }`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          >
                            {pct > 15 && (
                              <span className={`text-xs font-bold ${isLast ? 'text-green-300' : 'text-[#A78BFA]'}`}>
                                {item.count}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`text-sm font-bold w-10 text-right flex-shrink-0 ${isLast ? 'text-green-400' : 'text-white'}`}>
                          {item.count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* Seção 2: Leads na Etapa 7 */}
              <section className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Users className="w-5 h-5 text-green-400" />
                  <h2 className="text-base font-semibold text-white">Leads na Etapa 7 — Fechados</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Hoje', value: etapa7.hoje, color: 'border-[#7B3FE4]/30 bg-[#7B3FE4]/5' },
                    { label: 'Esta Semana', value: etapa7.semana, color: 'border-blue-500/30 bg-blue-500/5' },
                    { label: 'Este Mês', value: etapa7.mes, color: 'border-green-500/30 bg-green-500/5' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={`rounded-xl border p-5 text-center ${color}`}>
                      <p className="text-3xl font-bold text-white mb-1">{value}</p>
                      <p className="text-xs text-[#71717A]">{label}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Seção 3: Referidos */}
              <section className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Share2 className="w-5 h-5 text-[#7B3FE4]" />
                  <h2 className="text-base font-semibold text-white">Referidos Coletados</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border border-[#7B3FE4]/30 bg-[#7B3FE4]/5 p-5 text-center">
                    <p className="text-3xl font-bold text-white mb-1">{referidos.total}</p>
                    <p className="text-xs text-[#71717A]">Total de Referidos</p>
                  </div>
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5 text-center">
                    <p className="text-3xl font-bold text-white mb-1">{referidos.leadsComReferidos}</p>
                    <p className="text-xs text-[#71717A]">Leads que Geraram Referidos</p>
                  </div>
                  <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-5 text-center">
                    <p className="text-3xl font-bold text-white mb-1">
                      {referidos.leadsComReferidos > 0
                        ? (referidos.total / referidos.leadsComReferidos).toFixed(1)
                        : '0'}
                    </p>
                    <p className="text-xs text-[#71717A]">Média por Lead</p>
                  </div>
                </div>
              </section>

              {/* Seção 4: Leads Quentes */}
              <section className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Flame className="w-5 h-5 text-red-400" />
                  <h2 className="text-base font-semibold text-white">Leads Quentes que Precisam de Atenção</h2>
                  <span className="ml-auto text-xs text-[#71717A]">Ordenados por mais antigos</span>
                </div>
                {leadsQuentes.length === 0 ? (
                  <div className="text-center py-8">
                    <Flame className="w-8 h-8 mx-auto mb-2 text-[#2a2a2a]" />
                    <p className="text-sm text-[#444]">Nenhum lead quente no momento</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leadsQuentes.map(lead => {
                      const etapaNum = lead.etapa_agente || 1
                      const etapa = ETAPAS.find(e => e.n === etapaNum)
                      return (
                        <div
                          key={lead.id}
                          className="flex items-center gap-4 px-4 py-3 rounded-xl bg-red-950/20 border border-red-900/30 hover:border-red-700/40 transition-all"
                        >
                          <div className="w-8 h-8 rounded-full bg-red-900/40 border border-red-700/40 flex items-center justify-center flex-shrink-0">
                            <Flame className="w-4 h-4 text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {lead.nome || lead.telefone}
                            </p>
                            <p className="text-xs text-[#71717A] truncate">{lead.telefone}</p>
                          </div>
                          <div className="text-center flex-shrink-0">
                            <span className="text-xs px-2 py-1 rounded-full bg-[#7B3FE4]/20 text-[#A78BFA] border border-[#7B3FE4]/20">
                              Etapa {etapaNum} — {etapa?.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-[#71717A] flex-shrink-0">
                            <Clock className="w-3.5 h-3.5" />
                            {timeAgo(lead.updated_at)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
