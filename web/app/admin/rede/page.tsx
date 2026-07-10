'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import { Users, Share2, TrendingUp, Crown, ChevronDown, ChevronRight, Phone, RefreshCw } from 'lucide-react'

interface Lead {
  id: string
  nome: string | null
  telefone: string | null
  etapa_agente: number | null
  total_referidos: number | null
  updated_at: string
}

interface ContatoReferido {
  id: string
  nome: string | null
  telefone: string | null
  profissao: string | null
  hobby: string | null
  status: string
  indicado_por_telefone: string | null
  indicado_por_nome: string | null
  created_at: string
}

interface NoRede {
  lead: Lead
  referidos: ContatoReferido[]
  totalNivel2: number
  score: number
}

const etapaAgentLabels: Record<number, string> = {
  1: 'Apresentação', 2: 'Conexão', 3: 'D.I.', 4: 'Speech',
  5: 'Fechamento', 6: 'Pag.Pendente', 7: 'Referidos', 8: 'Validação',
}

const etapaColors: Record<number, string> = {
  1: '#71717A', 2: '#3B82F6', 3: '#8B5CF6', 4: '#F59E0B',
  5: '#EF4444', 6: '#F97316', 7: '#10B981', 8: '#22C55E',
}

function rendaScore(profissao: string | null): number {
  if (!profissao) return 1
  const p = profissao.toLowerCase()
  const alta = ['médic', 'medic', 'dentist', 'advogad', 'engenhei', 'empresári', 'empresari', 'diretor', 'ceo', 'cfo', 'gerente', 'consultor', 'arquitet', 'veterinári', 'farmacêut', 'farmaceut']
  const media = ['professor', 'enfermei', 'fisio', 'nutricion', 'psicolog', 'contador', 'administr', 'tecnolog', 'analista', 'desenvolv', 'designer']
  if (alta.some(k => p.includes(k))) return 5
  if (media.some(k => p.includes(k))) return 3
  return 2
}

function dadosScore(profissao: string | null, hobby: string | null): number {
  if (profissao && hobby) return 3
  if (profissao || hobby) return 1
  return 0
}

function calcScore(profissao: string | null, hobby: string | null): number {
  return rendaScore(profissao) + dadosScore(profissao, hobby)
}

function scoreBar(score: number, max = 8) {
  const pct = Math.round((score / max) * 100)
  const color = score >= 6 ? '#22C55E' : score >= 4 ? '#F59E0B' : '#EF4444'
  return { pct, color }
}

function tempoRelativo(iso: string | null): string {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `há ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

export default function RedePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [nos, setNos] = useState<NoRede[]>([])
  const [loading, setLoading] = useState(true)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [totalLeads, setTotalLeads] = useState(0)
  const [totalReferidos, setTotalReferidos] = useState(0)

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: leads }, { data: referidos }] = await Promise.all([
      supabase.from('leads').select('id,nome,telefone,etapa_agente,total_referidos,updated_at').order('total_referidos', { ascending: false, nullsFirst: false }),
      supabase.from('contatos_referidos').select('id,nome,telefone,profissao,hobby,status,indicado_por_telefone,indicado_por_nome,created_at'),
    ])

    if (!leads || !referidos) { setLoading(false); return }

    setTotalLeads(leads.length)
    setTotalReferidos(referidos.length)

    // Mapear referidos por telefone do lead que indicou
    const refPorTel: Record<string, ContatoReferido[]> = {}
    for (const r of referidos) {
      const tel = r.indicado_por_telefone
      if (!tel) continue
      if (!refPorTel[tel]) refPorTel[tel] = []
      refPorTel[tel].push(r as ContatoReferido)
    }

    // Para cada referido que virou lead, calcular seus próprios referidos (nível 2)
    const telLeads = new Set(leads.map(l => l.telefone).filter(Boolean))

    const nosRede: NoRede[] = leads
      .filter(l => l.telefone)
      .map(lead => {
        const refs = refPorTel[lead.telefone!] ?? []
        // Nível 2: referidos dos referidos que viraram leads
        let nivel2 = 0
        for (const r of refs) {
          if (r.telefone && telLeads.has(r.telefone)) {
            nivel2 += (refPorTel[r.telefone] ?? []).length
          }
        }
        const topScore = refs.length > 0
          ? Math.max(...refs.map(r => calcScore(r.profissao, r.hobby)))
          : 0
        return { lead, referidos: refs, totalNivel2: nivel2, score: topScore }
      })
      .filter(n => n.referidos.length > 0 || (n.lead.total_referidos ?? 0) > 0)
      .sort((a, b) => (b.referidos.length + b.totalNivel2) - (a.referidos.length + a.totalNivel2))

    setNos(nosRede)
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  const toggle = (id: string) => {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const potencialTotal = totalReferidos * 20
  const nivel2Total = nos.reduce((s, n) => s + n.totalNivel2, 0)

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Rede de Referidos — Crescimento Exponencial" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Métricas topo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: 'Leads na Rede',
                value: totalLeads,
                sub: 'total de leads',
                icon: <Users className="w-5 h-5" />,
                color: 'text-[#7B3FE4]',
              },
              {
                label: 'Referidos Nível 1',
                value: totalReferidos,
                sub: 'indicados diretos',
                icon: <Share2 className="w-5 h-5" />,
                color: 'text-blue-400',
              },
              {
                label: 'Referidos Nível 2',
                value: nivel2Total,
                sub: 'indicados dos indicados',
                icon: <Share2 className="w-5 h-5" />,
                color: 'text-indigo-400',
              },
              {
                label: 'Potencial Rede',
                value: potencialTotal,
                sub: 'se cada 1 indicar 20',
                icon: <TrendingUp className="w-5 h-5" />,
                color: 'text-emerald-400',
              },
            ].map(m => (
              <div key={m.label} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
                <div className={`mb-3 ${m.color}`}>{m.icon}</div>
                <p className="text-3xl font-bold text-white">{m.value.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-[#52525B] mt-1">{m.label}</p>
                <p className="text-xs text-[#3F3F46] mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Banner crescimento exponencial */}
          <div className="bg-gradient-to-r from-[#7B3FE4]/10 to-[#3B82F6]/10 border border-[#7B3FE4]/20 rounded-2xl p-5 flex items-center gap-4">
            <TrendingUp className="w-8 h-8 text-[#7B3FE4] flex-shrink-0" />
            <div>
              <p className="text-white font-semibold">Crescimento Orgânico Exponencial</p>
              <p className="text-sm text-[#71717A] mt-0.5">
                Hoje: <span className="text-white">{totalLeads} leads</span> com{' '}
                <span className="text-white">{totalReferidos} referidos</span>.
                Se cada referido fechar e indicar 20,{' '}
                <span className="text-emerald-400 font-semibold">
                  potencial de {(totalReferidos * 20).toLocaleString('pt-BR')} leads na próxima geração.
                </span>
              </p>
            </div>
          </div>

          {/* Árvore da rede */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : nos.length === 0 ? (
            <div className="text-center py-20 text-[#52525B]">
              <Share2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum dado de rede ainda.</p>
              <p className="text-xs mt-1">Os dados aparecem quando o agente coletar referidos.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">
                  {nos.length} nós na rede
                </h2>
                <button onClick={carregar} className="p-2 text-[#71717A] hover:text-white hover:bg-[#1C1C1E] rounded-lg transition-colors">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {nos.map((no, idx) => {
                const aberto = expandidos.has(no.lead.id)
                const refs = no.referidos
                const topScore = no.score
                const { pct, color } = scoreBar(topScore)
                const isTop = idx === 0
                const totalNetwork = refs.length + no.totalNivel2

                return (
                  <div key={no.lead.id} className={`bg-[#111113] border rounded-2xl overflow-hidden transition-all ${isTop ? 'border-[#7B3FE4]/40' : 'border-[#1C1C1E]'}`}>
                    {/* Header do nó */}
                    <button
                      onClick={() => toggle(no.lead.id)}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[#18181A] transition-colors text-left"
                    >
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${isTop ? 'bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] text-white' : 'bg-[#1C1C1E] text-[#71717A]'}`}>
                        {isTop ? <Crown className="w-5 h-5" /> : (no.lead.nome || '?').charAt(0).toUpperCase()}
                      </div>

                      {/* Nome + telefone */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">{no.lead.nome || 'não identificado'}</p>
                          {isTop && <span className="text-xs bg-[#7B3FE4]/20 text-[#9B6FF4] px-2 py-0.5 rounded-full">Top Indicador</span>}
                        </div>
                        <p className="text-xs text-[#52525B]">{no.lead.telefone || '—'}</p>
                      </div>

                      {/* Etapa */}
                      <div className="hidden md:block">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: (etapaColors[no.lead.etapa_agente ?? 0] ?? '#52525B') + '20', color: etapaColors[no.lead.etapa_agente ?? 0] ?? '#52525B' }}>
                          {etapaAgentLabels[no.lead.etapa_agente ?? 0] ?? '—'}
                        </span>
                      </div>

                      {/* Contadores */}
                      <div className="flex items-center gap-6 text-center">
                        <div>
                          <p className="text-lg font-bold text-white">{refs.length}</p>
                          <p className="text-[10px] text-[#52525B]">Nível 1</p>
                        </div>
                        {no.totalNivel2 > 0 && (
                          <div>
                            <p className="text-lg font-bold text-indigo-400">{no.totalNivel2}</p>
                            <p className="text-[10px] text-[#52525B]">Nível 2</p>
                          </div>
                        )}
                        <div>
                          <p className="text-lg font-bold text-emerald-400">{totalNetwork}</p>
                          <p className="text-[10px] text-[#52525B]">Total Rede</p>
                        </div>
                      </div>

                      {/* Score bar */}
                      {refs.length > 0 && (
                        <div className="hidden lg:block w-24">
                          <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <p className="text-[10px] text-[#52525B] mt-1 text-center">score {topScore}/8</p>
                        </div>
                      )}

                      {/* Expand */}
                      <div className="text-[#52525B]">
                        {aberto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </div>
                    </button>

                    {/* Lista de referidos */}
                    {aberto && refs.length > 0 && (
                      <div className="border-t border-[#1C1C1E]">
                        <div className="px-6 py-3 bg-[#0D0D0F]">
                          <p className="text-xs text-[#52525B] uppercase tracking-wider">Referidos de {no.lead.nome || 'lead'}</p>
                        </div>
                        <div className="divide-y divide-[#1C1C1E]">
                          {refs
                            .sort((a, b) => calcScore(b.profissao, b.hobby) - calcScore(a.profissao, a.hobby))
                            .map(ref => {
                              const s = calcScore(ref.profissao, ref.hobby)
                              const sb = scoreBar(s)
                              return (
                                <div key={ref.id} className="flex items-center gap-4 px-6 py-3 hover:bg-[#18181A] transition-colors">
                                  {/* Indicador de nível */}
                                  <div className="w-4 flex-shrink-0 flex items-center justify-center">
                                    <div className="w-px h-4 bg-[#1C1C1E]" />
                                  </div>

                                  <div className="w-7 h-7 rounded-lg bg-[#1C1C1E] flex items-center justify-center text-xs font-bold text-[#71717A] flex-shrink-0">
                                    {(ref.nome || '?').charAt(0).toUpperCase()}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white">{ref.nome || '—'}</p>
                                    <p className="text-xs text-[#52525B]">{ref.telefone || '—'}</p>
                                  </div>

                                  <div className="hidden md:flex items-center gap-4 text-xs text-[#71717A]">
                                    <span>{ref.profissao || '—'}</span>
                                    <span className="text-[#3F3F46]">·</span>
                                    <span>{ref.hobby || '—'}</span>
                                  </div>

                                  {/* Score */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${sb.pct}%`, background: sb.color }} />
                                    </div>
                                    <span className="text-xs font-mono" style={{ color: sb.color }}>{s}</span>
                                  </div>

                                  {/* Status */}
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    ref.status === 'vendido' ? 'bg-emerald-500/20 text-emerald-400' :
                                    ref.status === 'interessado' ? 'bg-orange-500/20 text-orange-400' :
                                    ref.status === 'contatado' ? 'bg-blue-500/20 text-blue-400' :
                                    'bg-zinc-500/20 text-zinc-400'
                                  }`}>
                                    {ref.status}
                                  </span>

                                  {ref.telefone && (
                                    <a
                                      href={`https://wa.me/55${ref.telefone.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={e => e.stopPropagation()}
                                      className="p-1.5 text-[#52525B] hover:text-green-400 hover:bg-[#1C1C1E] rounded-lg transition-colors"
                                    >
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              )
                            })}
                        </div>
                      </div>
                    )}

                    {aberto && refs.length === 0 && (
                      <div className="border-t border-[#1C1C1E] px-6 py-4 text-sm text-[#52525B]">
                        Sem referidos coletados ainda.
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
