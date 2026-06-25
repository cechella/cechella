'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Users, TrendingUp, DollarSign, ChevronRight,
  Activity, Network, Kanban, AlertTriangle, CheckCircle2,
  Clock, Flame, UserPlus, ArrowUpRight, Target, GitBranch,
  Bot, MessageSquare, Zap, PhoneCall, BarChart2, RefreshCw,
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
  dor_principal?: string
}

type Referido = {
  id: string
  nome: string
  telefone?: string
  profissao?: string | null
  hobby?: string | null
  status: string
  indicado_por_telefone?: string
  indicado_por_nome?: string
  created_at: string
}

type ReferidoComScore = Referido & { score: number }

type AgentStats = {
  conversasAtivas: number
  conversasHoje: number
  mensagensHoje: number
  mensagensSaidasHoje: number
  taxaResposta: number
  referidosColetadosAgente: number
  etapaDistribuicao: { etapa: string; total: number }[]
  mensagensPorHora: { hora: string; enviadas: number; recebidas: number }[]
  tempoMedioResposta: number
}

type OrigemStat = {
  origem: string
  label: string
  total: number
  cor: string
  emoji: string
}

type Stats = {
  totalLeads: number
  leadsHoje: number
  ganhos: number
  perdidos: number
  referidosTotais: number
  referidosValidados: number
  etapaCount: Record<number, number>
  temperaturaCounts: { quente: number; morno: number; frio: number }
  leadsPorDia: { dia: string; total: number }[]
  recentLeads: Lead[]
  alertas: { tipo: string; msg: string; href: string }[]
  agente: AgentStats
  origens: OrigemStat[]
  referidosComScore: ReferidoComScore[]
  topReferidos: ReferidoComScore[]
}

// ─── Constants ───────────────────────────────────────────
const etapaAgentLabels: Record<number, string> = {
  1: 'Apresentação', 2: 'Conexão', 3: 'D.I.', 4: 'Speech',
  5: 'Fechamento', 6: 'Pag. Pendente', 7: 'Referidos', 8: 'Validação'
}

const etapaAgentColors: Record<number, string> = {
  1: '#3B82F6', 2: '#06B6D4', 3: '#8B5CF6', 4: '#F59E0B',
  5: '#EF4444', 6: '#F97316', 7: '#10B981', 8: '#22C55E'
}

const tempColors = { quente: '#EF4444', morno: '#F59E0B', frio: '#3B82F6' }

const statusReferidoColors: Record<string, string> = {
  aguardando: '#F59E0B',
  contatado: '#3B82F6',
  interessado: '#F97316',
  vendido: '#22C55E',
}

function kpi(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

function daysSince(date: string) {
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (d === 0) return 'Hoje'
  if (d === 1) return 'Ontem'
  return `${d}d atrás`
}

function timeAgo(date: string) {
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ─── Scoring ─────────────────────────────────────────────
function calcScore(profissao: string | null | undefined, hobby: string | null | undefined): number {
  const prof = (profissao || '').toLowerCase()
  let renda = 1
  if (/médic|medic|dentist|advogad|empresár|empresar|jogador|diretor|engenheiro|arquitet|farmacêut/.test(prof)) renda = 5
  else if (/enfermeir|fisio|psicólog|psicolog|nutricionist|veterinár/.test(prof)) renda = 3
  else if (/professor|comerciant|secretár|recepcion|vendedor|técnic|tecnic|cabelerei/.test(prof)) renda = 2
  let dados = 0
  if (profissao && hobby) dados = 3
  else if (profissao || hobby) dados = 1
  return renda + dados
}

function scoreCircles(score: number): string {
  const filled = Math.round((score / 8) * 5)
  return '●'.repeat(filled) + '○'.repeat(5 - filled)
}

// ─── Supabase singleton ───────────────────────────────────
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

// ─── Component ───────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const supabase = getSupabase()

  async function load() {
    try {
      const [leadsRes, referidosRes] = await Promise.all([
        supabase.from('leads').select('id,nome,telefone,etapa_agente,temperatura,historico,total_referidos,updated_at,dor_principal').order('updated_at', { ascending: false }),
        supabase.from('contatos_referidos').select('id,nome,telefone,profissao,hobby,status,indicado_por_telefone,indicado_por_nome,created_at').order('created_at', { ascending: false }),
      ])

      const leads: Lead[] = leadsRes.data ?? []
      const referidos: Referido[] = referidosRes.data ?? []

      // ── Flatten historico messages ──
      const allMessages: Array<{role: string; content: string; ts: string; leadId: string}> = []
      leads.forEach(lead => {
        (lead.historico || []).forEach((msg: any) => {
          if (msg.ts) allMessages.push({ ...msg, leadId: lead.id })
        })
      })

      // ── Leads stats ──
      const hoje = new Date().toDateString()
      const leadsHoje = leads.filter(l => new Date(l.updated_at).toDateString() === hoje).length
      const ganhos = leads.filter(l => (l.etapa_agente ?? 0) >= 7).length
      const perdidos = 0
      const referidosValidados = referidos.filter(r => r.status === 'vendido').length

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
        const total = leads.filter(l => new Date(l.updated_at).toDateString() === d.toDateString()).length
        leadsPorDia.push({ dia: label, total })
      }

      // ── Origens ──
      const origensDef = [
        { origem: 'instagram', label: 'Instagram / ManyChat', cor: '#E1306C', emoji: '📸' },
        { origem: 'referido',  label: 'Referidos (Ana IA)',   cor: '#7B3FE4', emoji: '🔗' },
        { origem: 'site',      label: 'Site / Formulário',    cor: '#3B82F6', emoji: '🌐' },
        { origem: 'google',    label: 'Google Ads',           cor: '#F59E0B', emoji: '🔍' },
        { origem: 'whatsapp',  label: 'WhatsApp Direto',      cor: '#25D366', emoji: '💬' },
        { origem: 'manual',    label: 'Cadastro Manual',      cor: '#71717A', emoji: '✏️' },
      ]
      const origens: OrigemStat[] = origensDef.map(o => ({
        ...o,
        total: 0,
      })).filter(o => o.total > 0).sort((a, b) => b.total - a.total)

      // ── Alertas ──
      const alertas: { tipo: string; msg: string; href: string }[] = []
      const semContato = leads.filter(l => {
        const hrs = (Date.now() - new Date(l.updated_at).getTime()) / 3600000
        return hrs > 24 && (l.etapa_agente ?? 0) >= 1 && (l.etapa_agente ?? 0) <= 6
      })
      if (semContato.length > 0)
        alertas.push({ tipo: 'warn', msg: `${semContato.length} leads sem atualização há +24h`, href: '/admin/crm' })
      const quentes = leads.filter(l => l.temperatura === 'quente' && (l.etapa_agente ?? 0) < 7)
      if (quentes.length > 0)
        alertas.push({ tipo: 'hot', msg: `${quentes.length} leads quentes no funil — prioridade máxima`, href: '/admin/crm' })
      const pendentesRef = referidos.filter(r => r.status === 'aguardando').length
      if (pendentesRef > 0)
        alertas.push({ tipo: 'info', msg: `${pendentesRef} referidos aguardando contato`, href: '/admin/crm' })

      // ── Agent stats from historico ──
      const msgsHoje = allMessages.filter(m => new Date(m.ts).toDateString() === hoje)
      const msgsSaidas = msgsHoje.filter(m => m.role === 'assistant')
      const msgsEntradas = msgsHoje.filter(m => m.role === 'user')
      const taxaResposta = msgsEntradas.length > 0
        ? Math.round(msgsSaidas.length / msgsEntradas.length * 100)
        : 0

      const conversasAtivas = leads.filter(l => {
        const hrs = (Date.now() - new Date(l.updated_at).getTime()) / 3600000
        return hrs < 24 && (l.etapa_agente ?? 0) >= 1 && (l.etapa_agente ?? 0) <= 8
      }).length

      const conversasHoje = leads.filter(l => new Date(l.updated_at).toDateString() === hoje).length

      const referidosColetadosAgente = leads.reduce((acc, l) => acc + (l.total_referidos ?? 0), 0)

      // Distribuição de etapas
      const etapaConvCount: Record<number, number> = {}
      leads.forEach(l => {
        if (l.etapa_agente) etapaConvCount[l.etapa_agente] = (etapaConvCount[l.etapa_agente] ?? 0) + 1
      })
      const etapaDistribuicao = Object.entries(etapaConvCount)
        .map(([etapa, total]) => ({ etapa: etapaAgentLabels[Number(etapa)] ?? etapa, total }))
        .sort((a, b) => b.total - a.total)

      // Mensagens por hora (últimas 12h)
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

      // Tempo médio de resposta
      let tempoMedioResposta = 0
      const sortedMsgs = [...allMessages].sort((a,b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
      const deltas: number[] = []
      for (let i = 1; i < sortedMsgs.length; i++) {
        if (sortedMsgs[i].role === 'assistant' && sortedMsgs[i-1].role === 'user' &&
            sortedMsgs[i].leadId === sortedMsgs[i-1].leadId) {
          const delta = (new Date(sortedMsgs[i].ts).getTime() - new Date(sortedMsgs[i-1].ts).getTime()) / 60000
          if (delta < 60) deltas.push(delta)
        }
      }
      if (deltas.length > 0) tempoMedioResposta = Math.round(deltas.reduce((a,b) => a+b, 0) / deltas.length)

      // ── Referidos com score ──
      const referidosComScore: ReferidoComScore[] = referidos.map(r => ({
        ...r,
        score: calcScore(r.profissao, r.hobby)
      })).sort((a, b) => b.score - a.score)

      const topReferidos = referidosComScore.filter(r => r.status === 'aguardando').slice(0, 8)

      setStats({
        totalLeads: leads.length, leadsHoje, ganhos, perdidos,
        referidosTotais: referidos.length, referidosValidados,
        etapaCount, temperaturaCounts, leadsPorDia,
        recentLeads: leads.slice(0, 6), alertas, origens,
        referidosComScore,
        topReferidos,
        agente: {
          conversasAtivas, conversasHoje,
          mensagensHoje: msgsHoje.length,
          mensagensSaidasHoje: msgsSaidas.length,
          taxaResposta, referidosColetadosAgente,
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
    load()
    // Auto-refresh a cada 60s
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const taxaConversao = stats ? (stats.ganhos / Math.max(stats.totalLeads, 1) * 100).toFixed(1) : '—'
  const potencialRede = stats ? stats.ganhos * 20 : 0
  const ag = stats?.agente

  // Score de saúde do agente (0-100)
  const agentScore = ag ? Math.min(100, Math.round(
    (ag.taxaResposta * 0.4) +
    (ag.conversasAtivas > 0 ? 30 : 0) +
    (ag.tempoMedioResposta < 5 ? 30 : ag.tempoMedioResposta < 15 ? 15 : 0)
  )) : 0

  const agentScoreColor = agentScore >= 70 ? '#22C55E' : agentScore >= 40 ? '#F59E0B' : '#EF4444'
  const agentScoreLabel = agentScore >= 70 ? 'Excelente' : agentScore >= 40 ? 'Regular' : 'Atenção'

  // Funil chart data
  const etapaChartData = [1,2,3,4,5,6,7,8]
    .filter(n => (stats?.etapaCount[n] ?? 0) > 0)
    .map(n => ({
      etapa: etapaAgentLabels[n],
      total: stats?.etapaCount[n] ?? 0,
      fill: etapaAgentColors[n],
    }))

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin Master', role: 'admin' }} title="CEO Overview" />
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
                <h2 className="text-xl font-bold text-white">Bom dia, Vinícius 👋</h2>
                <p className="text-sm text-[#71717A]">Resumo executivo do Hormone Ecosystem</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={load} className="flex items-center gap-1.5 text-xs font-medium bg-[#111113] border border-[#1C1C1E] px-3 py-2 rounded-xl hover:border-[#27272A] hover:text-white transition-all text-[#A1A1AA]">
                  <RefreshCw className="w-3.5 h-3.5" /> Atualizar
                </button>
                {[
                  { label: 'CRM', href: '/admin/crm', icon: <Kanban className="w-4 h-4" />, color: 'text-[#7B3FE4]' },
                  { label: 'Rede', href: '/admin/rede', icon: <Network className="w-4 h-4" />, color: 'text-[#06B6D4]' },
                  { label: 'Analytics', href: '/admin/analytics', icon: <Activity className="w-4 h-4" />, color: 'text-[#3B82F6]' },
                ].map(a => (
                  <Link key={a.label} href={a.href}
                    className="flex items-center gap-1.5 text-xs font-medium bg-[#111113] border border-[#1C1C1E] px-3 py-2 rounded-xl hover:border-[#27272A] hover:text-white transition-all text-[#A1A1AA]">
                    <span className={a.color}>{a.icon}</span>{a.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ── Alertas ── */}
          {stats && stats.alertas.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {stats.alertas.map((a, i) => (
                <Link key={i} href={a.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm font-medium transition-all hover:brightness-110 ${
                    a.tipo === 'hot' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                    a.tipo === 'warn' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                    'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  }`}>
                  {a.tipo === 'hot' ? <Flame className="w-4 h-4 flex-shrink-0" /> :
                   a.tipo === 'warn' ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> :
                   <Clock className="w-4 h-4 flex-shrink-0" />}
                  <span className="truncate">{a.msg}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 ml-auto flex-shrink-0 opacity-60" />
                </Link>
              ))}
            </div>
          )}

          {/* ── KPIs principais ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            {[
              { label: 'Total Leads', value: loading ? '…' : kpi(stats?.totalLeads ?? 0), icon: <Users className="w-5 h-5" />, color: '#7B3FE4', sub: `+${stats?.leadsHoje ?? 0} hoje` },
              { label: 'Clientes Fechados', value: loading ? '…' : kpi(stats?.ganhos ?? 0), icon: <CheckCircle2 className="w-5 h-5" />, color: '#22C55E', sub: `Taxa ${taxaConversao}%` },
              { label: 'Taxa Conversão', value: loading ? '…' : `${taxaConversao}%`, icon: <Target className="w-5 h-5" />, color: '#3B82F6', sub: `etapas 7-8` },
              { label: 'Referidos Coletados', value: loading ? '…' : kpi(stats?.referidosTotais ?? 0), icon: <GitBranch className="w-5 h-5" />, color: '#06B6D4', sub: `${stats?.referidosValidados ?? 0} vendidos` },
              { label: 'Potencial Rede', value: loading ? '…' : kpi(potencialRede), icon: <Network className="w-5 h-5" />, color: '#F59E0B', sub: 'clientes × 20' },
              { label: 'MRR Est.', value: loading ? '…' : `R$ ${kpi((stats?.ganhos ?? 0) * 2800)}`, icon: <DollarSign className="w-5 h-5" />, color: '#EF4444', sub: 'ticket médio R$2.8k' },
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

          {/* ══════════════════════════════════════════
              AGENTE DE IA — PERFORMANCE
          ══════════════════════════════════════════ */}
          <div className="rounded-3xl border border-[#25D366]/20 bg-gradient-to-br from-[#25D366]/5 to-[#111113] p-5 space-y-5">
            {/* Cabeçalho do painel do agente */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-[#25D366]" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Agente de IA — WhatsApp</h3>
                  <p className="text-xs text-[#71717A]">Performance em tempo real · atualiza a cada 60s</p>
                </div>
              </div>
              {/* Score de saúde */}
              {!loading && ag && (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-[#52525B]">Score de Saúde</p>
                    <p className="font-bold text-sm" style={{ color: agentScoreColor }}>{agentScoreLabel}</p>
                  </div>
                  <div className="relative w-14 h-14">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#1C1C1E" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15" fill="none"
                        stroke={agentScoreColor} strokeWidth="3"
                        strokeDasharray={`${agentScore * 0.942} 100`}
                        strokeLinecap="round" />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">{agentScore}</span>
                  </div>
                </div>
              )}
            </div>

            {/* KPIs do agente */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {[
                { label: 'Conversas Ativas', value: loading ? '…' : (ag?.conversasAtivas ?? 0).toString(), icon: <MessageSquare className="w-4 h-4" />, color: '#25D366', sub: `${ag?.conversasHoje ?? 0} abertas hoje` },
                { label: 'Mensagens Hoje', value: loading ? '…' : (ag?.mensagensHoje ?? 0).toString(), icon: <Zap className="w-4 h-4" />, color: '#3B82F6', sub: `${ag?.mensagensSaidasHoje ?? 0} enviadas pelo agente` },
                { label: 'Taxa de Resposta', value: loading ? '…' : `${ag?.taxaResposta ?? 0}%`, icon: <BarChart2 className="w-4 h-4" />, color: ag && ag.taxaResposta >= 80 ? '#22C55E' : ag && ag.taxaResposta >= 50 ? '#F59E0B' : '#EF4444', sub: 'msgs saídas / entradas' },
                { label: 'Tempo Médio', value: loading ? '…' : ag?.tempoMedioResposta ? `${ag.tempoMedioResposta}min` : '—', icon: <Clock className="w-4 h-4" />, color: ag && ag.tempoMedioResposta < 5 ? '#22C55E' : ag && ag.tempoMedioResposta < 15 ? '#F59E0B' : '#EF4444', sub: 'tempo de resposta' },
                { label: 'Referidos pelo Agente', value: loading ? '…' : (ag?.referidosColetadosAgente ?? 0).toString(), icon: <GitBranch className="w-4 h-4" />, color: '#06B6D4', sub: 'coletados via WA' },
                { label: 'Conversas no Funil', value: loading ? '…' : (ag?.etapaDistribuicao.reduce((a, b) => a + b.total, 0) ?? 0).toString(), icon: <PhoneCall className="w-4 h-4" />, color: '#F59E0B', sub: 'etapas ativas' },
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
              {/* Mensagens por hora */}
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

              {/* Conversas ativas por etapa */}
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
                      const etapaNum = Object.entries(etapaAgentLabels).find(([, v]) => v === e.etapa)?.[0]
                      const color = etapaNum ? etapaAgentColors[Number(etapaNum)] : '#7B3FE4'
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[#A1A1AA]">{e.etapa}</span>
                            <span className="font-bold text-white">{e.total}</span>
                          </div>
                          <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${(e.total / max) * 100}%`, background: color }} />
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

          {/* ── Funil + Entradas ── */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Kanban className="w-4 h-4 text-[#7B3FE4]" /> Funil de Vendas
                </h3>
                <Link href="/admin/crm" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1 transition-colors">
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
                    <Bar dataKey="total" name="Leads" radius={[6,6,0,0]}>
                      {etapaChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
              {!loading && stats && (
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#1C1C1E]">
                  <span className="text-xs text-[#52525B] font-medium">Temperatura:</span>
                  {(['quente','morno','frio'] as const).map(t => (
                    <div key={t} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: tempColors[t] }} />
                      <span className="text-xs text-[#A1A1AA] capitalize">{t}</span>
                      <span className="text-xs font-bold text-white">{stats.temperaturaCounts[t]}</span>
                    </div>
                  ))}
                </div>
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
                      <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7B3FE4" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#7B3FE4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1C1C1E" />
                    <XAxis dataKey="dia" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 12, color: '#fff' }} />
                    <Area type="monotone" dataKey="total" name="Leads" stroke="#7B3FE4" fill="url(#gradLeads)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Origens dos Leads ── */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#7B3FE4]" /> Origem dos Leads
              </h3>
              <span className="text-xs text-[#52525B]">{stats?.totalLeads ?? 0} leads no total</span>
            </div>
            {loading ? (
              <div className="h-20 flex items-center justify-center text-[#52525B]">Carregando…</div>
            ) : !stats?.origens?.length ? (
              <p className="text-sm text-[#52525B] text-center py-6">Nenhum lead com origem registrada ainda</p>
            ) : (
              <div className="space-y-3">
                {stats.origens.map((o, i) => {
                  const pct = Math.round((o.total / Math.max(stats.totalLeads, 1)) * 100)
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-base w-6 flex-shrink-0">{o.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-[#A1A1AA] truncate">{o.label}</span>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <span className="text-xs font-bold text-white">{o.total}</span>
                            <span className="text-[10px] text-[#52525B] w-8 text-right">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-[#1C1C1E] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: o.cor }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="pt-3 border-t border-[#1C1C1E] grid grid-cols-3 gap-2 mt-2">
                  {[
                    { label: 'Orgânicos', value: stats.origens.filter(o => ['instagram','site','whatsapp'].includes(o.origem)).reduce((a,b) => a+b.total, 0), cor: '#22C55E' },
                    { label: 'Referidos', value: stats.origens.find(o => o.origem === 'referido')?.total ?? 0, cor: '#7B3FE4' },
                    { label: 'Pagos', value: stats.origens.find(o => o.origem === 'google')?.total ?? 0, cor: '#F59E0B' },
                  ].map((g, i) => (
                    <div key={i} className="bg-[#0A0A0B] rounded-xl p-3 text-center">
                      <p className="text-lg font-bold" style={{ color: g.cor }}>{g.value}</p>
                      <p className="text-[10px] text-[#52525B] mt-0.5">{g.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Leads Recentes + Rede ── */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#7B3FE4]" /> Leads Recentes
                </h3>
                <Link href="/admin/crm" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1 transition-colors">
                  Ver todos <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {loading ? (
                <div className="h-32 flex items-center justify-center text-[#52525B]">Carregando…</div>
              ) : (
                <div className="space-y-1">
                  {(stats?.recentLeads ?? []).map((lead, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[#1C1C1E]/50 last:border-0 hover:bg-[#18181A] rounded-xl px-2 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7B3FE4]/20 to-[#3B82F6]/20 flex items-center justify-center text-xs font-bold text-[#7B3FE4] flex-shrink-0">
                        {(lead.nome || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{lead.nome || '—'}</p>
                        <p className="text-xs text-[#52525B] truncate">{lead.telefone ?? '—'}</p>
                      </div>
                      {lead.etapa_agente && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                          style={{ background: etapaAgentColors[lead.etapa_agente] + '20', color: etapaAgentColors[lead.etapa_agente] }}>
                          {etapaAgentLabels[lead.etapa_agente]}
                        </span>
                      )}
                      {lead.temperatura && (
                        <span className="text-xs flex-shrink-0">
                          {lead.temperatura === 'quente' ? '🔥' : lead.temperatura === 'morno' ? '🟡' : '❄️'}
                        </span>
                      )}
                      <span className="text-xs text-[#52525B] flex-shrink-0">{daysSince(lead.updated_at)}</span>
                    </div>
                  ))}
                  {(stats?.recentLeads?.length ?? 0) === 0 && (
                    <p className="text-sm text-[#52525B] text-center py-8">Nenhum lead ainda</p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Network className="w-4 h-4 text-[#06B6D4]" /> Rede de Referidos
                </h3>
                <Link href="/admin/rede" className="text-xs text-[#06B6D4] hover:text-[#22D3EE] flex items-center gap-1 transition-colors">
                  Ver rede <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {loading ? (
                <div className="h-32 flex items-center justify-center text-[#52525B]">Carregando…</div>
              ) : (
                <div className="flex-1 space-y-4">
                  {[
                    { label: 'Nível 1', desc: 'Clientes × 20', value: potencialRede, color: '#22C55E' },
                    { label: 'Nível 2', desc: '30% × 20', value: Math.round(potencialRede * 0.3 * 20), color: '#3B82F6' },
                    { label: 'Nível 3', desc: '30% × 20', value: Math.round(potencialRede * 0.3 * 20 * 0.3 * 20), color: '#7B3FE4' },
                  ].map((n, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-[#A1A1AA]">{n.label} <span className="text-[#52525B]">— {n.desc}</span></span>
                        <span className="font-bold text-white">{kpi(n.value)}</span>
                      </div>
                      <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (n.value / Math.max(potencialRede * 100, 1)) * 100)}%`, background: n.color }} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-[#1C1C1E] grid grid-cols-2 gap-3">
                    <div className="bg-[#0A0A0B] rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-white">{kpi(stats?.referidosTotais ?? 0)}</p>
                      <p className="text-xs text-[#52525B] mt-0.5">Referidos coletados</p>
                    </div>
                    <div className="bg-[#0A0A0B] rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-emerald-400">{kpi(stats?.referidosValidados ?? 0)}</p>
                      <p className="text-xs text-[#52525B] mt-0.5">Vendidos</p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-[#7B3FE4]/10 to-[#06B6D4]/10 border border-[#7B3FE4]/20 rounded-xl p-3 text-center">
                    <p className="text-xs text-[#71717A] mb-0.5">Multiplicador total (3 níveis)</p>
                    <p className="text-2xl font-black text-white">
                      {stats?.ganhos ? `×${(potencialRede * 0.3 * 20 * 0.3 * 20 / Math.max(stats.ganhos, 1)).toFixed(0)}` : '—'}
                    </p>
                    <p className="text-xs text-[#52525B]">potencial vs clientes atuais</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 🎯 Top Referidos — Prioridade Ana ── */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-[#F59E0B]" /> 🎯 Top Referidos — Prioridade Ana
              </h3>
              <span className="text-xs text-[#52525B]">ordenado por score de potencial</span>
            </div>
            {loading ? (
              <div className="h-32 flex items-center justify-center text-[#52525B]">Carregando…</div>
            ) : !stats?.topReferidos?.length ? (
              <p className="text-sm text-[#52525B] text-center py-8">Nenhum referido aguardando contato</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-[#1C1C1E]">
                        <th className="pb-3 text-xs font-medium text-[#52525B] w-20">Score</th>
                        <th className="pb-3 text-xs font-medium text-[#52525B]">Nome</th>
                        <th className="pb-3 text-xs font-medium text-[#52525B] hidden md:table-cell">Profissão</th>
                        <th className="pb-3 text-xs font-medium text-[#52525B] hidden lg:table-cell">Hobby</th>
                        <th className="pb-3 text-xs font-medium text-[#52525B] hidden md:table-cell">Indicado por</th>
                        <th className="pb-3 text-xs font-medium text-[#52525B]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topReferidos.map((r, i) => {
                        const statusColor = statusReferidoColors[r.status] ?? '#71717A'
                        return (
                          <tr key={r.id} className="border-b border-[#1C1C1E]/50 last:border-0 hover:bg-[#18181A] transition-colors">
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white w-5 text-right">{i + 1}</span>
                                <span className="text-[#F59E0B] font-mono text-xs tracking-tight">{scoreCircles(r.score)}</span>
                              </div>
                            </td>
                            <td className="py-3 pr-3">
                              <div>
                                <p className="font-medium text-white text-sm">{r.nome}</p>
                                {r.telefone && <p className="text-[10px] text-[#52525B]">{r.telefone}</p>}
                              </div>
                            </td>
                            <td className="py-3 pr-3 hidden md:table-cell">
                              <span className="text-xs text-[#A1A1AA]">{r.profissao || '—'}</span>
                            </td>
                            <td className="py-3 pr-3 hidden lg:table-cell">
                              <span className="text-xs text-[#A1A1AA]">{r.hobby || '—'}</span>
                            </td>
                            <td className="py-3 pr-3 hidden md:table-cell">
                              <span className="text-xs text-[#71717A]">{r.indicado_por_nome || r.indicado_por_telefone || '—'}</span>
                            </td>
                            <td className="py-3">
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                                style={{ background: statusColor + '20', color: statusColor }}>
                                {r.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-[#52525B] mt-4 pt-3 border-t border-[#1C1C1E] text-center">
                  Ana contata automaticamente nessa ordem
                </p>
              </>
            )}
          </div>

        </main>
      </div>
    </div>
  )
}
