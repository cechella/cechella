'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { createBrowserClient } from '@supabase/ssr'
import {
  TrendingUp, Users, Share2, Zap, ChevronRight, Crown, Award, Star
} from 'lucide-react'

interface Lead {
  id: string
  nome: string
  email: string
  etapa: string
  created_at: string
  referido_id: string | null
}

interface Referido {
  id: string
  lead_origem_id: string
  nome: string | null
  telefone: string
  tipo: 'normal' | 'nao_fechou'
  status: string
  nivel: number
  referido_por_referido_id: string | null
  created_at: string
}

interface NodoArvore {
  lead: Lead
  referidos: Referido[]
  totalRede: number
  niveis: { nivel: number; count: number }[]
  potencial: number
}

export default function RedeReferidosPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [referidos, setReferidos] = useState<Referido[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: leadsData }, { data: referidosData }] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('referidos').select('*').order('created_at', { ascending: false }),
    ])
    if (leadsData) setLeads(leadsData as Lead[])
    if (referidosData) setReferidos(referidosData as Referido[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  // Métricas globais
  const totalLeads = leads.length
  const totalReferidos = referidos.length
  const referidosValidados = referidos.filter(r => r.status === 'validado').length
  const leadsDeReferidos = leads.filter(l => l.referido_id).length
  const leadsOrganicos = totalLeads - leadsDeReferidos
  const taxaConversaoReferidos = totalReferidos > 0 ? Math.round((referidosValidados / totalReferidos) * 100) : 0

  // Projeção exponencial
  const clientesFechados = leads.filter(l => l.etapa === 'ganho').length
  const projecaoNivel1 = clientesFechados * 20
  const projecaoNivel2 = Math.round(projecaoNivel1 * 0.3 * 20) // 30% fecham
  const projecaoNivel3 = Math.round(projecaoNivel2 * 0.3 * 20)
  const totalPotencial = projecaoNivel1 + projecaoNivel2 + projecaoNivel3

  // Top indicadores
  const contagemPorLead = leads.map(lead => ({
    lead,
    totalReferidos: referidos.filter(r => r.lead_origem_id === lead.id).length,
    validados: referidos.filter(r => r.lead_origem_id === lead.id && r.status === 'validado').length,
  })).filter(l => l.totalReferidos > 0).sort((a, b) => b.totalReferidos - a.totalReferidos).slice(0, 5)

  // Distribuição por nível
  const porNivel = [1, 2, 3].map(n => ({
    nivel: n,
    count: referidos.filter(r => r.nivel === n).length,
    validados: referidos.filter(r => r.nivel === n && r.status === 'validado').length,
  }))

  // Árvore simplificada dos top leads
  const arvore: NodoArvore[] = leads
    .filter(l => l.etapa === 'ganho' || referidos.some(r => r.lead_origem_id === l.id))
    .map(lead => {
      const refs = referidos.filter(r => r.lead_origem_id === lead.id)
      const niveis = [1, 2, 3].map(n => ({ nivel: n, count: refs.filter(r => r.nivel === n).length }))
      return {
        lead,
        referidos: refs,
        totalRede: refs.length,
        niveis,
        potencial: refs.length * 20,
      }
    })
    .sort((a, b) => b.totalRede - a.totalRede)
    .slice(0, 10)

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Rede de Referidos — Visão CEO" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* KPIs principais */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#7B3FE4]/20 to-[#3B82F6]/10 border border-[#7B3FE4]/30 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-6 h-6 text-[#7B3FE4]" />
                <span className="text-xs text-[#7B3FE4] bg-[#7B3FE4]/20 px-2 py-0.5 rounded-full">Total</span>
              </div>
              <p className="text-4xl font-bold text-white">{totalLeads}</p>
              <p className="text-sm text-[#71717A] mt-1">Leads na rede</p>
              <div className="mt-3 flex gap-3 text-xs">
                <span className="text-emerald-400">{leadsDeReferidos} de referidos</span>
                <span className="text-[#71717A]">{leadsOrganicos} orgânicos</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <Share2 className="w-6 h-6 text-emerald-400" />
                <span className="text-xs text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full">Referidos</span>
              </div>
              <p className="text-4xl font-bold text-white">{totalReferidos}</p>
              <p className="text-sm text-[#71717A] mt-1">Contatos indicados</p>
              <div className="mt-3 flex gap-3 text-xs">
                <span className="text-emerald-400">{referidosValidados} validados</span>
                <span className="text-[#71717A]">{taxaConversaoReferidos}% taxa</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <TrendingUp className="w-6 h-6 text-yellow-400" />
                <span className="text-xs text-yellow-400 bg-yellow-500/20 px-2 py-0.5 rounded-full">Potencial</span>
              </div>
              <p className="text-4xl font-bold text-white">{totalPotencial.toLocaleString('pt-BR')}</p>
              <p className="text-sm text-[#71717A] mt-1">Leads potenciais (3 níveis)</p>
              <div className="mt-3 flex gap-3 text-xs">
                <span className="text-yellow-400">Base: {clientesFechados} ganhos</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <Zap className="w-6 h-6 text-cyan-400" />
                <span className="text-xs text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-full">Multiplicador</span>
              </div>
              <p className="text-4xl font-bold text-white">
                {totalLeads > 0 ? `${((totalReferidos / Math.max(totalLeads, 1)) + 1).toFixed(1)}x` : '20x'}
              </p>
              <p className="text-sm text-[#71717A] mt-1">Cada cliente gera</p>
              <div className="mt-3 text-xs text-cyan-400">20 referidos por ganho</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">

            {/* Projeção exponencial */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-[#7B3FE4]" />
                <h3 className="text-sm font-semibold text-white">Projeção Exponencial</h3>
              </div>
              <p className="text-xs text-[#71717A] mb-4">Base: {clientesFechados} clientes fechados × 20 referidos × 30% fecham</p>
              <div className="space-y-3">
                {[
                  { nivel: 'Nível 1', count: projecaoNivel1, color: 'bg-[#7B3FE4]', width: 100 },
                  { nivel: 'Nível 2', count: projecaoNivel2, color: 'bg-[#3B82F6]', width: projecaoNivel1 > 0 ? Math.round((projecaoNivel2 / projecaoNivel1) * 100) : 0 },
                  { nivel: 'Nível 3', count: projecaoNivel3, color: 'bg-[#06B6D4]', width: projecaoNivel1 > 0 ? Math.round((projecaoNivel3 / projecaoNivel1) * 100) : 0 },
                ].map(p => (
                  <div key={p.nivel}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#71717A]">{p.nivel}</span>
                      <span className="text-white font-medium">{p.count.toLocaleString('pt-BR')} leads</span>
                    </div>
                    <div className="h-2 bg-[#1C1C1E] rounded-full overflow-hidden">
                      <div className={`h-full ${p.color} rounded-full transition-all`} style={{ width: `${Math.min(p.width, 100)}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-[#1C1C1E] flex justify-between">
                  <span className="text-xs text-[#71717A]">Total potencial</span>
                  <span className="text-sm font-bold text-[#7B3FE4]">{totalPotencial.toLocaleString('pt-BR')} leads</span>
                </div>
              </div>
            </div>

            {/* Distribuição por nível real */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Referidos por Nível</h3>
              </div>
              <p className="text-xs text-[#71717A] mb-4">Distribuição real da cadeia atual</p>
              {totalReferidos === 0 ? (
                <div className="text-center py-8 text-[#71717A]">
                  <Share2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Nenhum referido ainda</p>
                  <p className="text-xs mt-1">A cadeia começa quando o agente coletar os primeiros 20</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {porNivel.map(n => (
                    <div key={n.nivel} className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-[#1C1C1E] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                        N{n.nivel}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#71717A]">Nível {n.nivel}</span>
                          <span className="text-white">{n.count} total · {n.validados} validados</span>
                        </div>
                        <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: totalReferidos > 0 ? `${Math.round((n.count / totalReferidos) * 100)}%` : '0%' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top indicadores */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-yellow-400" />
                <h3 className="text-sm font-semibold text-white">Top Indicadores</h3>
              </div>
              {contagemPorLead.length === 0 ? (
                <div className="text-center py-8 text-[#71717A]">
                  <Crown className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Nenhum indicador ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contagemPorLead.map((item, i) => (
                    <div key={item.lead.id} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                        i === 1 ? 'bg-zinc-400/20 text-zinc-300' :
                        i === 2 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-[#1C1C1E] text-[#71717A]'
                      }`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{item.lead.nome}</p>
                        <p className="text-xs text-[#71717A]">{item.totalReferidos} indicados · {item.validados} validados</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#7B3FE4]">{item.totalReferidos * 20}</p>
                        <p className="text-[10px] text-[#71717A]">potencial</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Árvore de clientes */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1C1C1E] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#7B3FE4]" />
                <h3 className="text-sm font-semibold text-white">Árvore de Crescimento</h3>
              </div>
              <span className="text-xs text-[#71717A]">Cada linha = 1 cliente e sua rede</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : arvore.length === 0 ? (
              <div className="text-center py-16 text-[#71717A]">
                <Zap className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">A árvore começa a crescer quando o agente coletar os primeiros referidos</p>
                <p className="text-xs mt-2 text-[#3B82F6]">Cada cliente ganho gera 20 contatos → efeito bola de neve</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1C1C1E]">
                {arvore.map((nodo, i) => (
                  <div key={nodo.lead.id} className="px-6 py-4 hover:bg-[#18181A] transition-colors">
                    <div className="flex items-center gap-4">
                      {/* Posição */}
                      <div className="w-8 h-8 rounded-xl bg-[#1C1C1E] flex items-center justify-center text-xs font-bold text-[#71717A] flex-shrink-0">
                        {i + 1}
                      </div>

                      {/* Info do lead */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">{nodo.lead.nome}</p>
                          {nodo.lead.etapa === 'ganho' && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full">Ganho</span>
                          )}
                        </div>
                        <p className="text-xs text-[#71717A]">{nodo.lead.email}</p>
                      </div>

                      {/* Rede visual */}
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-xl font-bold text-white">{nodo.totalRede}</p>
                          <p className="text-[10px] text-[#71717A]">indicados</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#71717A]" />
                        <div className="flex gap-3">
                          {nodo.niveis.map(n => n.count > 0 && (
                            <div key={n.nivel} className="text-center">
                              <p className="text-sm font-medium text-[#3B82F6]">{n.count}</p>
                              <p className="text-[10px] text-[#71717A]">N{n.nivel}</p>
                            </div>
                          ))}
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#71717A]" />
                        <div className="text-center">
                          <p className="text-xl font-bold text-[#7B3FE4]">{nodo.potencial.toLocaleString('pt-BR')}</p>
                          <p className="text-[10px] text-[#71717A]">potencial N2</p>
                        </div>
                      </div>
                    </div>

                    {/* Barra de progresso da rede */}
                    {nodo.totalRede > 0 && (
                      <div className="mt-3 ml-12">
                        <div className="flex gap-1">
                          {Array.from({ length: Math.min(nodo.totalRede, 20) }).map((_, j) => (
                            <div
                              key={j}
                              className={`h-1.5 flex-1 rounded-full ${
                                j < nodo.referidos.filter(r => r.status === 'validado').length
                                  ? 'bg-emerald-500'
                                  : j < nodo.referidos.filter(r => r.status === 'conversa_iniciada' || r.status === 'validado').length
                                  ? 'bg-[#7B3FE4]'
                                  : j < nodo.referidos.filter(r => r.status !== 'pendente').length
                                  ? 'bg-[#3B82F6]'
                                  : 'bg-[#1C1C1E]'
                              }`}
                            />
                          ))}
                          {nodo.totalRede > 20 && (
                            <span className="text-[10px] text-[#71717A] ml-1">+{nodo.totalRede - 20}</span>
                          )}
                        </div>
                        <div className="flex gap-4 mt-1 text-[10px] text-[#71717A]">
                          <span className="flex items-center gap-1"><span className="w-2 h-1.5 bg-emerald-500 rounded-full inline-block" /> validados</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-1.5 bg-[#7B3FE4] rounded-full inline-block" /> em conversa</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-1.5 bg-[#3B82F6] rounded-full inline-block" /> msg enviada</span>
                          <span className="flex items-center gap-1"><span className="w-2 h-1.5 bg-[#1C1C1E] rounded-full inline-block" /> pendente</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
