'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Users, TrendingUp, DollarSign, Share2, ArrowUpRight,
  ArrowDownRight, RefreshCw, Target, Zap,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────
type Lead = {
  id: string
  nome: string | null
  etapa_agente: number | null
  temperatura: string | null
  created_at: string
  updated_at: string
  total_referidos: number | null
  origem: string | null
}

type Referido = {
  id: string
  profissao: string | null
  hobby: string | null
  status: string
  created_at: string
  indicado_por_telefone: string | null
}

type Periodo = '7d' | '30d' | '90d' | '1y'

const PERIODO_LABELS: Record<Periodo, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  '1y': 'Este ano',
}

const PERIODO_DIAS: Record<Periodo, number> = {
  '7d': 7, '30d': 30, '90d': 90, '1y': 365,
}

const etapaLabels: Record<number, string> = {
  1: 'Apresentação', 2: 'Conexão', 3: 'D.I.', 4: 'Speech',
  5: 'Fechamento', 6: 'Pag.Pendente', 7: 'Referidos', 8: 'Validação',
}
const etapaColors: Record<number, string> = {
  1: '#3B82F6', 2: '#06B6D4', 3: '#8B5CF6', 4: '#F59E0B',
  5: '#EF4444', 6: '#F97316', 7: '#10B981', 8: '#22C55E',
}

const TICKET_MEDIO = 2800

function rendaScore(profissao: string | null): number {
  if (!profissao) return 1
  const p = profissao.toLowerCase()
  if (/médic|medic|dentist|advogad|empresár|empresari|diretor|ceo|engenhei|arquitet|farmac/.test(p)) return 5
  if (/enfermeir|fisio|psicolog|nutricion|professor|contador|analista|desenvolv/.test(p)) return 3
  return 2
}

function calcScore(profissao: string | null, hobby: string | null): number {
  return rendaScore(profissao) + ((profissao && hobby) ? 3 : (profissao || hobby) ? 1 : 0)
}

function fmt(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return n.toString()
}

function dayLabel(date: Date, dias: number): string {
  if (dias <= 7) return date.toLocaleDateString('pt-BR', { weekday: 'short' })
  if (dias <= 30) return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
}

const TOOLTIP_STYLE = {
  background: '#111113', border: '1px solid #1C1C1E',
  borderRadius: 10, color: '#fff', fontSize: 12,
}

// ─── Component ───────────────────────────────────────────────
export default function AnalyticsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [periodo, setPeriodo] = useState<Periodo>('30d')
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<Lead[]>([])
  const [referidos, setReferidos] = useState<Referido[]>([])

  const carregar = useCallback(async () => {
    setLoading(true)
    const [{ data: l }, { data: r }] = await Promise.all([
      supabase.from('leads').select('id,nome,etapa_agente,temperatura,created_at,updated_at,total_referidos,origem'),
      supabase.from('contatos_referidos').select('id,profissao,hobby,status,created_at,indicado_por_telefone'),
    ])
    setLeads((l ?? []) as Lead[])
    setReferidos((r ?? []) as Referido[])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  // ── Filtrar por período ──────────────────────────────────────
  const dias = PERIODO_DIAS[periodo]
  const cutoff = new Date(Date.now() - dias * 86400000)

  const leadsPeriodo = leads.filter(l => new Date(l.created_at) >= cutoff)
  const refsPeriodo = referidos.filter(r => new Date(r.created_at) >= cutoff)

  // ── KPIs ─────────────────────────────────────────────────────
  const totalLeads = leadsPeriodo.length
  const ganhos = leads.filter(l => (l.etapa_agente ?? 0) >= 7).length
  const receitaEst = ganhos * TICKET_MEDIO
  const taxaConv = totalLeads > 0 ? ((ganhos / totalLeads) * 100).toFixed(1) : '0.0'
  const totalRefs = refsPeriodo.length
  const refsVendidos = refsPeriodo.filter(r => r.status === 'vendido').length
  const taxaRef = totalRefs > 0 ? ((refsVendidos / totalRefs) * 100).toFixed(1) : '0.0'
  const scoreMedio = referidos.length > 0
    ? (referidos.reduce((s, r) => s + calcScore(r.profissao, r.hobby), 0) / referidos.length).toFixed(1)
    : '0.0'

  // ── Leads por dia ────────────────────────────────────────────
  const buckets = dias <= 30 ? dias : Math.ceil(dias / 7)
  const bucketSize = dias <= 30 ? 1 : 7
  const leadsPorDia = Array.from({ length: buckets }, (_, i) => {
    const d = new Date(Date.now() - (buckets - 1 - i) * bucketSize * 86400000)
    const start = new Date(d); start.setHours(0, 0, 0, 0)
    const end = new Date(start.getTime() + bucketSize * 86400000)
    return {
      label: dayLabel(d, dias),
      leads: leads.filter(l => { const t = new Date(l.created_at); return t >= start && t < end }).length,
      referidos: referidos.filter(r => { const t = new Date(r.created_at); return t >= start && t < end }).length,
    }
  })

  // ── Funil real ───────────────────────────────────────────────
  const funil = [1, 2, 3, 4, 5, 6, 7, 8].map(n => ({
    n,
    label: etapaLabels[n],
    count: leads.filter(l => l.etapa_agente === n).length,
    color: etapaColors[n],
  }))
  const maxFunil = Math.max(...funil.map(f => f.count), 1)

  // ── Temperatura (todos os leads, não só período) ─────────────
  const tempData = [
    { name: 'Quente 🔥', value: leads.filter(l => l.temperatura === 'quente').length, color: '#EF4444' },
    { name: 'Morno 🟡', value: leads.filter(l => l.temperatura === 'morno').length, color: '#F59E0B' },
    { name: 'Frio ❄️', value: leads.filter(l => l.temperatura === 'frio').length, color: '#3B82F6' },
  ].filter(t => t.value > 0)

  // ── Top profissões dos referidos ─────────────────────────────
  const profMap: Record<string, { total: number; vendidos: number; scoreSum: number }> = {}
  referidos.forEach(r => {
    const key = r.profissao || 'Não informada'
    if (!profMap[key]) profMap[key] = { total: 0, vendidos: 0, scoreSum: 0 }
    profMap[key].total++
    if (r.status === 'vendido') profMap[key].vendidos++
    profMap[key].scoreSum += calcScore(r.profissao, r.hobby)
  })
  const topProfissoes = Object.entries(profMap)
    .map(([prof, d]) => ({
      prof,
      total: d.total,
      vendidos: d.vendidos,
      scoreMedio: d.total > 0 ? (d.scoreSum / d.total).toFixed(1) : '0',
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  // ── Leads por origem ─────────────────────────────────────────
  const ORIGEM_META: Record<string, { label: string; emoji: string; color: string }> = {
    instagram:    { label: 'Instagram',   emoji: '📸', color: '#EC4899' },
    referido:     { label: 'Referido',    emoji: '🔗', color: '#818CF8' },
    landing_page: { label: 'Site',        emoji: '🌐', color: '#3B82F6' },
    google:       { label: 'Google',      emoji: '🔍', color: '#F59E0B' },
    whatsapp:     { label: 'WhatsApp',    emoji: '💬', color: '#22C55E' },
    organico:     { label: 'Orgânico',    emoji: '🌿', color: '#06B6D4' },
    manual:       { label: 'Manual',      emoji: '✍️', color: '#71717A' },
  }
  const origemMap: Record<string, number> = {}
  leads.forEach(l => {
    const key = l.origem || 'manual'
    origemMap[key] = (origemMap[key] || 0) + 1
  })
  const origemData = Object.entries(origemMap)
    .map(([key, count]) => ({
      key,
      count,
      pct: leads.length > 0 ? Math.round(count / leads.length * 100) : 0,
      ...(ORIGEM_META[key] || { label: key, emoji: '📌', color: '#71717A' }),
    }))
    .sort((a, b) => b.count - a.count)

  // ── Status dos referidos ─────────────────────────────────────
  const statusFunil = [
    { label: 'Aguardando', count: referidos.filter(r => r.status === 'aguardando').length, color: '#F59E0B' },
    { label: 'Contatado', count: referidos.filter(r => r.status === 'contatado').length, color: '#3B82F6' },
    { label: 'Interessado', count: referidos.filter(r => r.status === 'interessado').length, color: '#F97316' },
    { label: 'Vendido', count: referidos.filter(r => r.status === 'vendido').length, color: '#22C55E' },
  ]
  const maxStatus = Math.max(...statusFunil.map(s => s.count), 1)

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Analytics — Dados Reais" />
        <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* Período + Refresh */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2">
              {(Object.keys(PERIODO_LABELS) as Periodo[]).map(p => (
                <button key={p} onClick={() => setPeriodo(p)}
                  className={`text-xs font-medium px-4 py-2 rounded-xl border transition-all ${
                    periodo === p
                      ? 'bg-[#7B3FE4]/15 border-[#7B3FE4]/40 text-white'
                      : 'bg-[#111113] border-[#1C1C1E] text-[#71717A] hover:text-white hover:border-[#27272A]'
                  }`}>
                  {PERIODO_LABELS[p]}
                </button>
              ))}
            </div>
            <button onClick={carregar} className="flex items-center gap-1.5 text-xs text-[#71717A] hover:text-white bg-[#111113] border border-[#1C1C1E] px-3 py-2 rounded-xl transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
          </div>

          {/* KPIs reais */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Leads no Período', value: loading ? '…' : fmt(totalLeads), icon: <Users className="w-5 h-5" />, color: '#7B3FE4', sub: `${leads.length} total histórico` },
              { label: 'Taxa de Conversão', value: loading ? '…' : `${taxaConv}%`, icon: <Target className="w-5 h-5" />, color: '#3B82F6', sub: `${ganhos} clientes fechados` },
              { label: 'Receita Estimada', value: loading ? '…' : `R$ ${fmt(receitaEst)}`, icon: <DollarSign className="w-5 h-5" />, color: '#22C55E', sub: `ticket médio R$${TICKET_MEDIO.toLocaleString('pt-BR')}` },
              { label: 'Referidos Coletados', value: loading ? '…' : fmt(totalRefs), icon: <Share2 className="w-5 h-5" />, color: '#F59E0B', sub: `score médio ${scoreMedio}/8` },
            ].map((k, i) => (
              <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5 hover:border-[#27272A] transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-[#52525B] font-medium">{k.label}</span>
                  <span style={{ color: k.color }}>{k.icon}</span>
                </div>
                <p className="text-3xl font-bold text-white">{k.value}</p>
                <p className="text-xs text-[#52525B] mt-1.5">{k.sub}</p>
              </div>
            ))}
          </div>

          {/* Leads + Referidos por dia */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Crescimento — Leads e Referidos</h3>
              <span className="text-xs text-[#52525B]">dados reais do Supabase</span>
            </div>
            {loading ? (
              <div className="h-52 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={leadsPorDia}>
                  <defs>
                    <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7B3FE4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7B3FE4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gRefs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1C1C1E" />
                  <XAxis dataKey="label" tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717A', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#A1A1AA' }} />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="#7B3FE4" fill="url(#gLeads)" strokeWidth={2} />
                  <Area type="monotone" dataKey="referidos" name="Referidos" stroke="#06B6D4" fill="url(#gRefs)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Funil real + Status Referidos */}
          <div className="grid lg:grid-cols-2 gap-6">

            {/* Funil de etapas real */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-white">Funil Real — 8 Etapas</h3>
                <span className="text-xs text-[#52525B]">{leads.length} leads total</span>
              </div>
              {loading ? (
                <div className="h-52 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-2.5">
                  {funil.map((f, i) => {
                    const pct = Math.round((f.count / maxFunil) * 100)
                    const conv = i > 0 && funil[i-1].count > 0
                      ? Math.round((f.count / funil[i-1].count) * 100)
                      : null
                    return (
                      <div key={f.n}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#A1A1AA]">E{f.n} {f.label}</span>
                          <div className="flex items-center gap-2">
                            {conv !== null && (
                              <span className={`flex items-center gap-0.5 ${conv >= 50 ? 'text-emerald-400' : 'text-[#71717A]'}`}>
                                {conv >= 50 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {conv}%
                              </span>
                            )}
                            <span className="font-bold text-white w-5 text-right">{f.count}</span>
                          </div>
                        </div>
                        <div className="h-5 bg-[#18181A] rounded-lg overflow-hidden">
                          <div
                            className="h-full rounded-lg transition-all duration-700 flex items-center px-2"
                            style={{ width: f.count === 0 ? '4px' : `${Math.max(pct, 8)}%`, background: f.color, opacity: f.count === 0 ? 0.2 : 1 }}
                          >
                            {f.count > 0 && pct > 15 && (
                              <span className="text-[10px] font-bold text-white">{f.count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div className="pt-2 border-t border-[#1C1C1E] flex justify-between text-xs">
                    <span className="text-[#52525B]">Receita estimada (etapas 7-8)</span>
                    <span className="font-bold text-emerald-400">R$ {(ganhos * TICKET_MEDIO).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Funil de referidos */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-white">Funil de Referidos</h3>
                <span className="text-xs text-[#52525B]">{referidos.length} total</span>
              </div>
              {loading ? (
                <div className="h-52 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {statusFunil.map((s, i) => {
                    const pct = Math.round((s.count / maxStatus) * 100)
                    const conv = i > 0 && statusFunil[i-1].count > 0
                      ? Math.round((s.count / statusFunil[i-1].count) * 100)
                      : null
                    return (
                      <div key={s.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-[#A1A1AA]">{s.label}</span>
                          <div className="flex items-center gap-2">
                            {conv !== null && (
                              <span className={`flex items-center gap-0.5 ${conv >= 30 ? 'text-emerald-400' : 'text-[#71717A]'}`}>
                                {conv >= 30 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {conv}%
                              </span>
                            )}
                            <span className="font-bold text-white">{s.count}</span>
                          </div>
                        </div>
                        <div className="h-7 bg-[#18181A] rounded-xl overflow-hidden">
                          <div
                            className="h-full rounded-xl transition-all duration-700 flex items-center px-3"
                            style={{ width: s.count === 0 ? '4px' : `${Math.max(pct, 10)}%`, background: s.color, opacity: s.count === 0 ? 0.2 : 1 }}
                          >
                            {s.count > 0 && pct > 10 && (
                              <span className="text-xs font-bold text-white">{Math.round(s.count / referidos.length * 100)}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div className="pt-2 border-t border-[#1C1C1E] grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#52525B]">Taxa aguard→vendido</span>
                      <p className="font-bold text-white mt-0.5">{taxaRef}%</p>
                    </div>
                    <div>
                      <span className="text-[#52525B]">Score médio da rede</span>
                      <p className="font-bold text-[#F59E0B] mt-0.5">{scoreMedio}/8</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Top profissões + Temperatura */}
          <div className="grid lg:grid-cols-2 gap-6">

            {/* Top profissões */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-white">Top Profissões — Referidos</h3>
                <span className="text-xs text-[#52525B]">renda alta = prioridade</span>
              </div>
              {loading ? (
                <div className="h-52 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : topProfissoes.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-[#52525B] text-sm">
                  Sem dados de profissão ainda
                </div>
              ) : (
                <div className="space-y-3">
                  {topProfissoes.map((p, i) => {
                    const maxTotal = topProfissoes[0].total
                    const pct = Math.round((p.total / maxTotal) * 100)
                    const score = parseFloat(p.scoreMedio)
                    const scoreColor = score >= 6 ? '#22C55E' : score >= 4 ? '#F59E0B' : '#71717A'
                    return (
                      <div key={p.prof} className="flex items-center gap-3">
                        <span className="text-xs text-[#52525B] w-4 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[#A1A1AA] truncate">{p.prof}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span style={{ color: scoreColor }} className="font-mono text-[10px]">⬛{p.scoreMedio}</span>
                              <span className="font-bold text-white">{p.total}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: `${pct}%`, background: scoreColor }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Temperatura dos leads */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-white">Temperatura dos Leads</h3>
                <span className="text-xs text-[#52525B]">{leads.length} leads total</span>
              </div>
              {loading ? (
                <div className="h-52 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={tempData} barSize={40}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1C1C1E" />
                      <XAxis dataKey="name" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="value" name="Leads" radius={[6, 6, 0, 0]}>
                        {tempData.map((t, i) => <Cell key={i} fill={t.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {tempData.map(t => (
                      <div key={t.name} className="text-center">
                        <p className="text-xl font-bold text-white">{t.value}</p>
                        <p className="text-xs text-[#52525B] mt-0.5">{t.name}</p>
                        <p className="text-xs font-medium mt-0.5" style={{ color: t.color }}>
                          {leads.length > 0 ? Math.round(t.value / leads.length * 100) : 0}%
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Origem dos Leads */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-white">Origem dos Leads</h3>
              <span className="text-xs text-[#52525B]">{leads.length} total</span>
            </div>
            {loading ? (
              <div className="h-24 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-[#7B3FE4] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : origemData.length === 0 ? (
              <p className="text-sm text-[#52525B] text-center py-8">Sem dados ainda</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {origemData.map(o => (
                  <div key={o.key} className="bg-[#18181A] rounded-xl p-4 text-center border border-[#1C1C1E]">
                    <div className="text-2xl mb-1">{o.emoji}</div>
                    <p className="text-xl font-bold text-white">{o.count}</p>
                    <p className="text-[10px] text-[#71717A] mt-0.5">{o.label}</p>
                    <p className="text-xs font-bold mt-1" style={{ color: o.color }}>{o.pct}%</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Insight final */}
          <div className="bg-gradient-to-r from-[#7B3FE4]/10 to-[#3B82F6]/10 border border-[#7B3FE4]/20 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-[#7B3FE4] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white mb-1">Insight da IA</p>
                <p className="text-sm text-[#71717A]">
                  {ganhos === 0
                    ? `Você tem ${leads.length} leads no funil. Nenhum fechou ainda — foco em levar quem está em Pag.Pendente para Referidos.`
                    : `${ganhos} ${ganhos === 1 ? 'cliente fechado' : 'clientes fechados'} gerando R$ ${(ganhos * TICKET_MEDIO).toLocaleString('pt-BR')} estimados. ` +
                      `Com ${referidos.length} referidos coletados e score médio ${scoreMedio}/8, ` +
                      `o potencial da próxima geração é R$ ${(referidos.length * TICKET_MEDIO).toLocaleString('pt-BR')}.`
                  }
                </p>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}
