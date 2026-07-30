'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Users, TrendingUp, DollarSign, ChevronRight,
  Activity, Kanban, CheckCircle2,
  Clock, ArrowUpRight, Target, GitBranch,
  Bot, MessageSquare, Zap, PhoneCall, BarChart2, RefreshCw,
  GraduationCap, Star, Network,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────
type Lead = {
  id: string
  nome: string | null
  telefone?: string
  etapa_agente?: number
  temperatura?: string
  historico?: Array<{role: string; content: string; ts?: string}>
  total_referidos?: number
  updated_at: string
  created_at?: string
  dor_principal?: string
  origem?: string | null
}

type AgentStats = {
  conversasAtivas: number
  conversasHoje: number
  mensagensHoje: number
  mensagensSaidasHoje: number
  taxaResposta: number
  etapaDistribuicao: { etapa: string; total: number }[]
  mensagensPorHora: { hora: string; enviadas: number; recebidas: number }[]
  tempoMedioResposta: number
}

type Stats = {
  totalLeads: number
  leadsHoje: number
  ganhos: number
  etapaCount: Record<number, number>
  temperaturaCounts: { quente: number; morno: number; frio: number }
  leadsPorDia: { dia: string; total: number }[]
  recentLeads: Lead[]
  agente: AgentStats
  faturamentoHoje: number
  faturamentoOntem: number
  leadsNovosHoje: number
  mediaLeads7d: number
  maiorSangramento: { de: string; para: string; perdeu: number; pct: number } | null
}

const etapaLabels: Record<number, string> = {
  1: 'Apresentação', 2: 'Conexão', 3: 'D.I.', 4: 'Speech',
  5: 'Fechamento', 6: 'Pag. Pendente', 7: 'Referidos', 8: 'Validação'
}
const etapaColors: Record<number, string> = {
  1: '#3B82F6', 2: '#06B6D4', 3: '#8B5CF6', 4: '#F59E0B',
  5: '#EF4444', 6: '#F97316', 7: '#10B981', 8: '#22C55E'
}
const etapaShort: Record<number, string> = {
  1: 'Apresentação', 2: 'Conexão', 3: 'D.I.', 4: 'Speech',
  5: 'Fechamento', 6: 'Pag. Pend.', 7: 'Referidos', 8: 'Validação',
}

type PipelineEtapa = { n: number; label: string; count: number; color: string }

function kpi(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}
function timeAgo(date: string) {
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

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

const modules = [
  { num: 1, title: 'Vendas', progress: 60, color: 'from-[#7B3FE4] to-[#4C1B9B]' },
  { num: 2, title: 'Influência', progress: 20, color: 'from-[#3B82F6] to-[#1D4ED8]' },
  { num: 3, title: 'Liderança', progress: 0, color: 'from-amber-500 to-amber-600' },
  { num: 4, title: 'Modelos', progress: 0, color: 'from-emerald-500 to-emerald-600' },
]

export default function MedicalDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [pipeline, setPipeline] = useState<PipelineEtapa[]>([])
  const [pipelineFlash, setPipelineFlash] = useState<number | null>(null)

  const supabase = getSupabase()

  async function load() {
    try {
      const leadsRes = await supabase
        .from('leads')
        .select('id,nome,telefone,etapa_agente,temperatura,historico,total_referidos,updated_at,created_at,dor_principal,origem')
        .order('updated_at', { ascending: false })

      const leads: Lead[] = leadsRes.data ?? []

      const allMessages: Array<{role: string; content: string; ts: string; leadId: string}> = []
      leads.forEach(lead => {
        ;(lead.historico || []).forEach((msg: any) => {
          if (msg.ts) allMessages.push({ ...msg, leadId: lead.id })
        })
      })

      const hoje = new Date().toDateString()
      const ontem = new Date(); ontem.setDate(ontem.getDate() - 1)
      const ontemStr = ontem.toDateString()

      const leadsHoje = leads.filter(l => new Date(l.updated_at).toDateString() === hoje).length
      const ganhos = leads.filter(l => (l.etapa_agente ?? 0) >= 7).length

      const etapaCount: Record<number, number> = {}
      leads.forEach(l => {
        if (l.etapa_agente) etapaCount[l.etapa_agente] = (etapaCount[l.etapa_agente] ?? 0) + 1
      })

      const temperaturaCounts = {
        quente: leads.filter(l => l.temperatura === 'quente').length,
        morno: leads.filter(l => l.temperatura === 'morno').length,
        frio: leads.filter(l => l.temperatura === 'frio').length,
      }

      const leadsPorDia: { dia: string; total: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        const label = d.toLocaleDateString('pt-BR', { weekday: 'short' })
        const total = leads.filter(l => {
          const ref = l.created_at || l.updated_at
          return new Date(ref).toDateString() === d.toDateString()
        }).length
        leadsPorDia.push({ dia: label, total })
      }

      const TICKET = 8400
      const fechadosHoje = leads.filter(l => (l.etapa_agente ?? 0) >= 7 && new Date(l.updated_at).toDateString() === hoje).length
      const fechadosOntem = leads.filter(l => (l.etapa_agente ?? 0) >= 7 && new Date(l.updated_at).toDateString() === ontemStr).length
      const faturamentoHoje = fechadosHoje * TICKET
      const faturamentoOntem = fechadosOntem * TICKET

      const leadsNovosHoje = leads.filter(l => l.created_at && new Date(l.created_at).toDateString() === hoje).length
      let totalUltimos7 = 0
      for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() - i)
        totalUltimos7 += leads.filter(l => l.created_at && new Date(l.created_at).toDateString() === d.toDateString()).length
      }
      const mediaLeads7d = Math.round((totalUltimos7 / 7) * 10) / 10

      let maiorSangramento: Stats['maiorSangramento'] = null
      for (let n = 1; n <= 7; n++) {
        const atual = etapaCount[n] ?? 0
        const prox = etapaCount[n + 1] ?? 0
        if (atual > 0) {
          const perdeu = atual - prox
          const pct = Math.round((perdeu / atual) * 100)
          if (!maiorSangramento || perdeu > maiorSangramento.perdeu) {
            maiorSangramento = { de: etapaLabels[n], para: etapaLabels[n + 1], perdeu, pct }
          }
        }
      }

      const msgsHoje = allMessages.filter(m => new Date(m.ts).toDateString() === hoje)
      const msgsSaidas = msgsHoje.filter(m => m.role === 'assistant')
      const msgsEntradas = msgsHoje.filter(m => m.role === 'user')
      const taxaResposta = msgsEntradas.length > 0 ? Math.round(msgsSaidas.length / msgsEntradas.length * 100) : 0
      const conversasAtivas = leads.filter(l => {
        const hrs = (Date.now() - new Date(l.updated_at).getTime()) / 3600000
        return hrs < 24 && (l.etapa_agente ?? 0) >= 1
      }).length
      const conversasHoje = leads.filter(l => new Date(l.updated_at).toDateString() === hoje).length

      const etapaConvCount: Record<number, number> = {}
      leads.forEach(l => {
        if (l.etapa_agente) etapaConvCount[l.etapa_agente] = (etapaConvCount[l.etapa_agente] ?? 0) + 1
      })
      const etapaDistribuicao = Object.entries(etapaConvCount)
        .map(([e, total]) => ({ etapa: etapaLabels[Number(e)] ?? e, total }))
        .sort((a, b) => b.total - a.total)

      const mensagensPorHora: { hora: string; enviadas: number; recebidas: number }[] = []
      for (let i = 11; i >= 0; i--) {
        const h = new Date(); h.setHours(h.getHours() - i, 0, 0, 0)
        const label = h.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        const enviadas = allMessages.filter(m => {
          const t = new Date(m.ts)
          return t.getHours() === h.getHours() && t.toDateString() === h.toDateString() && m.role === 'assistant'
        }).length
        const recebidas = allMessages.filter(m => {
          const t = new Date(m.ts)
          return t.getHours() === h.getHours() && t.toDateString() === h.toDateString() && m.role === 'user'
        }).length
        mensagensPorHora.push({ hora: label, enviadas, recebidas })
      }

      const sortedMsgs = [...allMessages].sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
      const deltas: number[] = []
      for (let i = 1; i < sortedMsgs.length; i++) {
        if (sortedMsgs[i].role === 'assistant' && sortedMsgs[i - 1].role === 'user' &&
          sortedMsgs[i].leadId === sortedMsgs[i - 1].leadId) {
          const delta = (new Date(sortedMsgs[i].ts).getTime() - new Date(sortedMsgs[i - 1].ts).getTime()) / 60000
          if (delta < 60) deltas.push(delta)
        }
      }
      const tempoMedioResposta = deltas.length > 0 ? Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length) : 0

      setStats({
        totalLeads: leads.length, leadsHoje, ganhos,
        etapaCount, temperaturaCounts, leadsPorDia,
        recentLeads: leads,
        faturamentoHoje, faturamentoOntem, leadsNovosHoje, mediaLeads7d, maiorSangramento,
        agente: {
          conversasAtivas, conversasHoje,
          mensagensHoje: msgsHoje.length,
          mensagensSaidasHoje: msgsSaidas.length,
          taxaResposta,
          etapaDistribuicao,
          mensagensPorHora,
          tempoMedioResposta,
        },
      })
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!stats) return
    setPipeline([1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
      n, label: etapaShort[n], count: stats.etapaCount[n] ?? 0, color: etapaColors[n],
    })))
  }, [stats])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000)
    const channel = supabase
      .channel('medical-pipeline')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload: any) => {
        const newE = (payload.new as any).etapa_agente as number | null
        const oldE = (payload.old as any).etapa_agente as number | null
        if (newE && newE !== oldE) {
          setPipeline(prev => prev.map(e => ({
            ...e,
            count: e.n === newE ? e.count + 1 : e.n === oldE ? Math.max(0, e.count - 1) : e.count,
          })))
          setPipelineFlash(newE)
          setTimeout(() => setPipelineFlash(null), 2000)
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload: any) => {
        const etapa = (payload.new as any).etapa_agente as number | null
        if (etapa) {
          setPipeline(prev => prev.map(e => e.n === etapa ? { ...e, count: e.count + 1 } : e))
          setPipelineFlash(etapa)
          setTimeout(() => setPipelineFlash(null), 2000)
        }
      })
      .subscribe()
    return () => { clearInterval(interval); supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ag = stats?.agente
  const taxaConversao = stats ? (stats.ganhos / Math.max(stats.totalLeads, 1) * 100).toFixed(1) : '—'
  const agentScore = ag ? Math.min(100, Math.round(
    (ag.taxaResposta * 0.4) + (ag.conversasAtivas > 0 ? 30 : 0) +
    (ag.tempoMedioResposta < 5 ? 30 : ag.tempoMedioResposta < 15 ? 15 : 0)
  )) : 0
  const agentScoreColor = agentScore >= 70 ? '#22C55E' : agentScore >= 40 ? '#F59E0B' : '#EF4444'
  const agentScoreLabel = agentScore >= 70 ? 'Excelente' : agentScore >= 40 ? 'Regular' : 'Atenção'
  const etapaChartData = [1, 2, 3, 4, 5, 6, 7, 8]
    .filter(n => (stats?.etapaCount[n] ?? 0) > 0)
    .map(n => ({ etapa: etapaLabels[n], total: stats?.etapaCount[n] ?? 0, fill: etapaColors[n] }))

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="Business OS" />
        <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* ── Header ── */}
          <div className="relative bg-gradient-to-r from-[#7B3FE4]/10 via-[#3B82F6]/10 to-[#06B6D4]/10 border border-[#7B3FE4]/20 rounded-3xl p-5 overflow-hidden">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(123,63,228,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(59,130,246,0.1) 0%, transparent 50%)',
            }} />
            <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-400">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                  <span className="text-xs text-[#52525B] ml-2">
                    Atualizado {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white">Bom dia, Dr. Ricardo 👋</h2>
                <p className="text-sm text-[#71717A]">Cockpit do seu consultório — Hormone Business OS</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={load} className="flex items-center gap-1.5 text-xs font-medium bg-[#111113] border border-[#1C1C1E] px-3 py-2 rounded-xl hover:border-[#27272A] hover:text-white transition-all text-[#A1A1AA]">
                  <RefreshCw className="w-3.5 h-3.5" /> Atualizar
                </button>
                {[
                  { label: 'CRM', href: '/medical/crm', icon: <Kanban className="w-4 h-4" />, color: 'text-[#7B3FE4]' },
                  { label: 'Rede', href: '/medical/rede', icon: <Network className="w-4 h-4" />, color: 'text-[#06B6D4]' },
                  { label: 'Analytics', href: '/medical/analytics', icon: <Activity className="w-4 h-4" />, color: 'text-[#3B82F6]' },
                ].map(a => (
                  <Link key={a.label} href={a.href}
                    className="flex items-center gap-1.5 text-xs font-medium bg-[#111113] border border-[#1C1C1E] px-3 py-2 rounded-xl hover:border-[#27272A] hover:text-white transition-all text-[#A1A1AA]">
                    <span className={a.color}>{a.icon}</span>{a.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── CEO Cockpit — 5 cards ── */}
          {!loading && stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
              {/* 1. Faturamento */}
              {(() => {
                const delta = stats.faturamentoOntem > 0
                  ? Math.round(((stats.faturamentoHoje - stats.faturamentoOntem) / stats.faturamentoOntem) * 100)
                  : stats.faturamentoHoje > 0 ? 100 : 0
                const isUp = delta >= 0
                return (
                  <div className="bg-[#111113] border border-emerald-500/20 rounded-2xl p-4 flex flex-col gap-1 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0" />
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-emerald-500/70">Faturamento Hoje</span>
                    <p className="text-2xl font-black text-white tabular-nums">
                      {stats.faturamentoHoje > 0 ? `R$ ${(stats.faturamentoHoje / 1000).toFixed(0)}k` : 'R$ 0'}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={isUp ? 'text-emerald-400' : 'text-red-400'}>{isUp ? '▲' : '▼'} {Math.abs(delta)}%</span>
                      <span className="text-[#52525B]">vs ontem</span>
                    </div>
                    <p className="text-[10px] text-[#52525B] mt-1">{stats.ganhos} fechamentos × R$8.4k <span className="text-amber-500/60">— estimado</span></p>
                  </div>
                )
              })()}

              {/* 2. Leads novos */}
              {(() => {
                const isUp = stats.leadsNovosHoje >= stats.mediaLeads7d
                return (
                  <div className="bg-[#111113] border border-blue-500/20 rounded-2xl p-4 flex flex-col gap-1 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/0 via-blue-500 to-blue-500/0" />
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-blue-400/70">Leads ANA Hoje</span>
                    <p className="text-2xl font-black text-white tabular-nums">+{stats.leadsNovosHoje}</p>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={isUp ? 'text-emerald-400' : 'text-amber-400'}>{isUp ? '▲' : '▼'}</span>
                      <span className="text-[#52525B]">média 7d: {stats.mediaLeads7d}/dia</span>
                    </div>
                    <p className="text-[10px] text-[#52525B] mt-1">{stats.leadsHoje} ativos hoje no total</p>
                  </div>
                )
              })()}

              {/* 3. Funil sangrando */}
              {(() => {
                const s = stats.maiorSangramento
                return (
                  <div className="bg-[#111113] border border-red-500/20 rounded-2xl p-4 flex flex-col gap-1 relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0" />
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-red-400/70">Funil Sangrando</span>
                    {s && s.perdeu > 0 ? (
                      <>
                        <p className="text-2xl font-black text-red-400 tabular-nums">−{s.perdeu}</p>
                        <div className="text-xs text-[#A1A1AA]">{s.de} → {s.para}</div>
                        <p className="text-[10px] text-[#52525B] mt-1">{s.pct}% de queda nessa transição</p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-black text-emerald-400">OK</p>
                        <p className="text-[10px] text-[#52525B] mt-1">Sem queda expressiva no funil</p>
                      </>
                    )}
                  </div>
                )
              })()}

              {/* 4. Saúde da ANA */}
              <div className="bg-[#111113] border border-[#25D366]/20 rounded-2xl p-4 flex flex-col gap-1 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#25D366]/0 via-[#25D366] to-[#25D366]/0" />
                <span className="text-[10px] font-semibold tracking-widest uppercase text-[#25D366]/70">Saúde da ANA</span>
                <p className="text-2xl font-black tabular-nums" style={{ color: agentScoreColor }}>{agentScore}</p>
                <div className="flex items-center gap-1.5 text-xs">
                  <span style={{ color: agentScoreColor }}>{agentScoreLabel}</span>
                  <span className="text-[#52525B]">· {ag?.taxaResposta ?? 0}% resp.</span>
                </div>
                <p className="text-[10px] text-[#52525B] mt-1">
                  {ag?.tempoMedioResposta ? `${ag.tempoMedioResposta}min tempo médio` : 'Sem mensagens hoje'}
                </p>
              </div>

              {/* 5. Score do negócio */}
              <div className="bg-[#111113] border border-amber-500/20 rounded-2xl p-4 flex flex-col gap-1 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0" />
                <span className="text-[10px] font-semibold tracking-widest uppercase text-amber-400/70">Score do Negócio</span>
                <p className="text-2xl font-black text-amber-400 tabular-nums">87/100</p>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-amber-400">Excelente</span>
                  <span className="text-[#52525B]">· Plano Elite</span>
                </div>
                <p className="text-[10px] text-[#52525B] mt-1">Próxima mentoria: 26 Fev · 19h</p>
              </div>
            </div>
          )}

          {/* ── KPIs principais ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Total Leads', value: loading ? '…' : kpi(stats?.totalLeads ?? 0), icon: <Users className="w-5 h-5" />, color: '#7B3FE4', sub: `+${stats?.leadsHoje ?? 0} hoje` },
              { label: 'Pacientes Fechados', value: loading ? '…' : kpi(stats?.ganhos ?? 0), icon: <CheckCircle2 className="w-5 h-5" />, color: '#22C55E', sub: `Taxa ${taxaConversao}%` },
              { label: 'Taxa Conversão', value: loading ? '…' : `${taxaConversao}%`, icon: <Target className="w-5 h-5" />, color: '#3B82F6', sub: 'etapas 7-8' },
              { label: 'Ticket Médio', value: 'R$ 8.4k', icon: <DollarSign className="w-5 h-5" />, color: '#10B981', sub: '+12% mês ant.' },
              { label: 'MRR Estimado', value: loading ? '…' : `R$ ${kpi((stats?.ganhos ?? 0) * 2800)}`, icon: <TrendingUp className="w-5 h-5" />, color: '#F59E0B', sub: 'recorrência mensal' },
              { label: 'Meta Julho', value: '74%', icon: <ArrowUpRight className="w-5 h-5" />, color: '#EF4444', sub: 'R$ 74k / R$ 100k' },
            ].map((k, i) => (
              <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 flex flex-col gap-2 hover:border-[#27272A] transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#52525B] font-medium leading-tight">{k.label}</span>
                  <span style={{ color: k.color }}>{k.icon}</span>
                </div>
                <p className="text-2xl font-bold text-white">{k.value}</p>
                <p className="text-xs text-[#52525B]">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Pipeline ao Vivo ── */}
          {pipeline.length > 0 && (
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-white">Pipeline ao Vivo</span>
                  <span className="text-xs text-[#52525B]">— atualiza em tempo real</span>
                </div>
                <span className="text-xs text-[#52525B]">
                  {pipeline.reduce((s, e) => s + e.count, 0)} leads no funil
                </span>
              </div>
              <div className="grid grid-cols-8 gap-2">
                {pipeline.map((etapa) => {
                  const isFlashing = pipelineFlash === etapa.n
                  const isActive = etapa.count > 0
                  const isPaid = etapa.n === 7 || etapa.n === 8
                  return (
                    <div key={etapa.n}
                      className={`relative rounded-xl p-3 border text-center transition-all duration-500 ${isFlashing ? 'scale-105 shadow-lg' : ''}`}
                      style={{
                        borderColor: isFlashing ? etapa.color : isActive ? etapa.color + '40' : '#1C1C1E',
                        background: isFlashing ? etapa.color + '30' : isActive ? etapa.color + '10' : '#0D0D0F',
                        boxShadow: isFlashing ? `0 0 20px ${etapa.color}60` : undefined,
                      }}
                    >
                      <div className="text-[10px] font-bold mb-1" style={{ color: isActive ? etapa.color : '#3F3F46' }}>E{etapa.n}</div>
                      <div className={`text-2xl font-bold transition-all ${isFlashing ? 'scale-110' : ''}`} style={{ color: isActive ? etapa.color : '#3F3F46' }}>{etapa.count}</div>
                      <div className="text-[9px] leading-tight mt-1 truncate" style={{ color: isActive ? '#A1A1AA' : '#3F3F46' }}>{etapa.label}</div>
                      {isPaid && etapa.count > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-white">$</span>
                        </div>
                      )}
                      {isFlashing && <div className="absolute inset-0 rounded-xl animate-ping opacity-20" style={{ background: etapa.color }} />}
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-0.5 mt-3 h-1 rounded-full overflow-hidden">
                {pipeline.map(etapa => {
                  const total = pipeline.reduce((s, e) => s + e.count, 0)
                  const pct = total > 0 ? (etapa.count / total) * 100 : 0
                  return <div key={etapa.n} className="h-full transition-all duration-700 rounded-sm" style={{ width: `${pct}%`, background: etapa.color, opacity: etapa.count > 0 ? 1 : 0 }} />
                })}
              </div>
            </div>
          )}

          {/* ── Agente de IA — ANA ── */}
          <div className="rounded-3xl border border-[#25D366]/20 bg-gradient-to-br from-[#25D366]/5 to-[#111113] p-5 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[#25D366]" />
                </div>
                <div>
                  <h3 className="font-bold text-white">ANA — Agente de IA WhatsApp</h3>
                  <p className="text-xs text-[#71717A]">Performance em tempo real · atualiza a cada 60s</p>
                </div>
              </div>
              {!loading && ag && (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-[#52525B]">Score de Saúde</p>
                    <p className="font-bold text-sm" style={{ color: agentScoreColor }}>{agentScoreLabel}</p>
                  </div>
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#1C1C1E" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none" stroke={agentScoreColor} strokeWidth="3"
                        strokeDasharray={`${agentScore * 0.942} 100`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">{agentScore}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {[
                { label: 'Conversas Ativas', value: loading ? '…' : (ag?.conversasAtivas ?? 0).toString(), icon: <MessageSquare className="w-4 h-4" />, color: '#25D366', sub: `${ag?.conversasHoje ?? 0} abertas hoje` },
                { label: 'Mensagens Hoje', value: loading ? '…' : (ag?.mensagensHoje ?? 0).toString(), icon: <Zap className="w-4 h-4" />, color: '#3B82F6', sub: `${ag?.mensagensSaidasHoje ?? 0} enviadas pelo agente` },
                { label: 'Taxa de Resposta', value: loading ? '…' : `${ag?.taxaResposta ?? 0}%`, icon: <BarChart2 className="w-4 h-4" />, color: ag && ag.taxaResposta >= 80 ? '#22C55E' : ag && ag.taxaResposta >= 50 ? '#F59E0B' : '#EF4444', sub: 'msgs saídas / entradas' },
                { label: 'Tempo Médio', value: loading ? '…' : ag?.tempoMedioResposta ? `${ag.tempoMedioResposta}min` : '—', icon: <Clock className="w-4 h-4" />, color: '#F59E0B', sub: 'tempo de resposta' },
                { label: 'Referidos pela ANA', value: loading ? '…' : '0', icon: <GitBranch className="w-4 h-4" />, color: '#06B6D4', sub: 'coletados via WA' },
                { label: 'Leads no Funil', value: loading ? '…' : (ag?.etapaDistribuicao.reduce((a, b) => a + b.total, 0) ?? 0).toString(), icon: <PhoneCall className="w-4 h-4" />, color: '#F59E0B', sub: 'etapas ativas' },
              ].map((k, i) => (
                <div key={i} className="bg-[#0A0A0B] border border-[#1C1C1E] rounded-2xl p-3 flex flex-col gap-1.5 hover:border-[#27272A] transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#52525B] font-medium leading-tight">{k.label}</span>
                    <span style={{ color: k.color }}>{k.icon}</span>
                  </div>
                  <p className="text-xl font-bold text-white">{k.value}</p>
                  <p className="text-[10px] text-[#52525B]">{k.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 bg-[#0A0A0B] border border-[#1C1C1E] rounded-2xl p-4">
                <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#25D366]" /> Mensagens — Últimas 12 horas
                </h4>
                {loading ? (
                  <div className="h-40 flex items-center justify-center text-[#52525B]">Carregando…</div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={ag?.mensagensPorHora ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1C1C1E" />
                      <XAxis dataKey="hora" tick={{ fill: '#52525B', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                      <YAxis tick={{ fill: '#52525B', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 12, color: '#fff', fontSize: 12 }} />
                      <Line type="monotone" dataKey="enviadas" name="Agente enviou" stroke="#25D366" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="recebidas" name="Lead respondeu" stroke="#3B82F6" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                <div className="flex gap-4 mt-3 pt-3 border-t border-[#1C1C1E]">
                  <div className="flex items-center gap-1.5 text-xs text-[#A1A1AA]"><div className="w-3 h-0.5 bg-[#25D366]" /> Agente enviou</div>
                  <div className="flex items-center gap-1.5 text-xs text-[#A1A1AA]"><div className="w-3 h-0.5 bg-[#3B82F6]" style={{ borderTop: '2px dashed #3B82F6', background: 'none' }} /> Lead respondeu</div>
                </div>
              </div>

              <div className="bg-[#0A0A0B] border border-[#1C1C1E] rounded-2xl p-4 flex flex-col gap-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Kanban className="w-4 h-4 text-[#25D366]" /> Conversas por Etapa
                </h4>
                {loading ? (
                  <div className="h-32 flex items-center justify-center text-[#52525B]">Carregando…</div>
                ) : ag && ag.etapaDistribuicao.length > 0 ? (
                  <div className="space-y-2">
                    {ag.etapaDistribuicao.map((e, i) => {
                      const max = Math.max(...ag.etapaDistribuicao.map(x => x.total), 1)
                      const etapaNum = Object.entries(etapaLabels).find(([, v]) => v === e.etapa)?.[0]
                      const color = etapaNum ? etapaColors[Number(etapaNum)] : '#7B3FE4'
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[#A1A1AA]">{e.etapa}</span>
                            <span className="font-bold text-white">{e.total}</span>
                          </div>
                          <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(e.total / max) * 100}%`, background: color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#52525B] text-center py-4">Nenhuma conversa ativa</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Leads ao Vivo ── */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1C1C1E]">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#7B3FE4]" /> Leads ao Vivo
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#52525B]">{stats?.totalLeads ?? 0} total</span>
                <Link href="/medical/crm" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1">
                  Ver CRM <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1C1C1E]">
                    <th className="text-left text-xs text-[#52525B] font-medium px-6 py-3">Lead</th>
                    <th className="text-left text-xs text-[#52525B] font-medium px-4 py-3">Etapa</th>
                    <th className="text-left text-xs text-[#52525B] font-medium px-4 py-3">Temp.</th>
                    <th className="text-left text-xs text-[#52525B] font-medium px-4 py-3">Referidos</th>
                    <th className="text-left text-xs text-[#52525B] font-medium px-4 py-3">Dor</th>
                    <th className="text-left text-xs text-[#52525B] font-medium px-4 py-3">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats?.recentLeads ?? []).slice(0, 10).map((lead, i) => (
                    <tr key={i} className="border-b border-[#1C1C1E] last:border-0 hover:bg-[#18181A] transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7B3FE4]/20 to-[#3B82F6]/20 flex items-center justify-center text-xs font-bold text-[#7B3FE4] flex-shrink-0">
                            {(lead.nome || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{lead.nome || '—'}</p>
                            <p className="text-xs text-[#52525B]">{lead.telefone || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: (etapaColors[lead.etapa_agente ?? 0] ?? '#52525B') + '20', color: etapaColors[lead.etapa_agente ?? 0] ?? '#52525B' }}>
                          {etapaLabels[lead.etapa_agente ?? 0] ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {lead.temperatura === 'quente' ? '🔥' : lead.temperatura === 'morno' ? '🟡' : lead.temperatura === 'frio' ? '❄️' : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-white font-medium">{lead.total_referidos ?? 0}</td>
                      <td className="px-4 py-3 text-xs text-[#71717A] max-w-[200px] truncate">{lead.dor_principal || '—'}</td>
                      <td className="px-4 py-3 text-xs text-[#52525B]">{timeAgo(lead.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Funil + Tendência ── */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Kanban className="w-4 h-4 text-[#7B3FE4]" /> Funil de Vendas
                </h3>
                <Link href="/medical/crm" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1 transition-colors">
                  Abrir CRM <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {loading ? (
                <div className="h-48 flex items-center justify-center text-[#52525B]">Carregando…</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={etapaChartData} barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1C1C1E" vertical={false} />
                    <XAxis dataKey="etapa" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 12, color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="total" name="Leads" radius={[6, 6, 0, 0]}>
                      {etapaChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#7B3FE4]" /> Leads — Últimos 7 dias
              </h3>
              {loading ? (
                <div className="h-48 flex items-center justify-center text-[#52525B]">Carregando…</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={stats?.leadsPorDia ?? []}>
                    <defs>
                      <linearGradient id="gradMed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7B3FE4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#7B3FE4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1C1C1E" />
                    <XAxis dataKey="dia" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 12, color: '#fff' }} />
                    <Area type="monotone" dataKey="total" name="Leads" stroke="#7B3FE4" fill="url(#gradMed)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Treinamento + Próxima Mentoria ── */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-amber-400" /> Treinamento — Progresso
                </h3>
                <Link href="/medical/escola" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1">
                  Ver módulos <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {modules.map(m => (
                  <Link key={m.num} href="/medical/escola" className="flex items-center gap-4 group">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>{m.num}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#A1A1AA] group-hover:text-white transition-colors">{m.title}</span>
                        <span className="text-[#52525B]">{m.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${m.color} rounded-full`} style={{ width: `${m.progress || 2}%` }} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#7B3FE4]/10 to-[#3B82F6]/5 border border-[#7B3FE4]/25 rounded-2xl p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-[#7B3FE4]" />
                <span className="text-xs font-semibold text-[#7B3FE4] uppercase tracking-wider">Próxima Mentoria</span>
              </div>
              <p className="text-base font-bold text-white mb-1">Implantes Pellet: técnica e dosimetria ao vivo</p>
              <div className="flex items-center gap-1.5 text-xs text-[#71717A] mb-auto">
                <Clock className="w-3 h-3" /> 26 Fev · 19h00 · Dr. Vinícius Cechella
              </div>
              <div className="mt-4 pt-4 border-t border-[#7B3FE4]/20 grid grid-cols-2 gap-3">
                <div className="bg-[#18181A]/60 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-white">87</p>
                  <p className="text-[10px] text-[#52525B]">Score negócio</p>
                </div>
                <div className="bg-[#18181A]/60 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-400">74%</p>
                  <p className="text-[10px] text-[#52525B]">Meta julho</p>
                </div>
              </div>
              <Link href="/medical/escola" className="mt-3 flex items-center justify-center gap-1.5 bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white text-xs font-semibold px-3 py-2.5 rounded-xl hover:opacity-90 transition-opacity w-full">
                Entrar na Sessão <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
