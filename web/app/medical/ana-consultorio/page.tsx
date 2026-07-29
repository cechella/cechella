'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import {
  Bot, Zap, MessageSquare, TrendingUp, Users, CheckCircle2,
  AlertCircle, Clock, ChevronRight, Settings, BarChart3,
  Phone, ArrowUpRight, Play, Pause
} from 'lucide-react'

const stats = [
  { label: 'Leads Atendidos Hoje', value: '23', trend: '+8 vs ontem', up: true },
  { label: 'Taxa de Qualificação', value: '68%', trend: '+5% este mês', up: true },
  { label: 'Consultas Agendadas', value: '7', trend: 'Esta semana', up: true },
  { label: 'Tempo Médio Resposta', value: '1m 20s', trend: '↓ 40s vs mês ant.', up: true },
]

const recentLeads = [
  { name: 'Marina Souza', time: '12 min atrás', status: 'qualificado', stage: 'Agendamento', phone: '47 99xxx-xxxx' },
  { name: 'Carlos Menezes', time: '35 min atrás', status: 'em_andamento', stage: 'Educação hormonal', phone: '11 98xxx-xxxx' },
  { name: 'Fernanda Lima', time: '1h atrás', status: 'qualificado', stage: 'Aguardando consulta', phone: '47 97xxx-xxxx' },
  { name: 'Roberto Alves', time: '2h atrás', status: 'desqualificado', stage: 'Contraindicação clínica', phone: '51 99xxx-xxxx' },
  { name: 'Patrícia Costa', time: '3h atrás', status: 'qualificado', stage: 'Proposta enviada', phone: '47 98xxx-xxxx' },
]

const statusMap: Record<string, { label: string; color: string }> = {
  qualificado: { label: 'Qualificado', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  em_andamento: { label: 'Em Atendimento', color: 'text-[#3B82F6] bg-[#3B82F6]/10 border-[#3B82F6]/20' },
  desqualificado: { label: 'Desqualificado', color: 'text-[#71717A] bg-[#18181A] border-[#27272A]' },
}

const anaConfig = {
  ativa: true,
  produto: 'Implante Hormonal',
  padrao: 'A — Consultivo High Ticket',
  numero: '+55 47 98850-7977',
  horario: '08h às 22h',
  respostas_hoje: 187,
}

export default function AnaConsultorioPage() {
  const [anaAtiva, setAnaAtiva] = useState(anaConfig.ativa)

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="medical" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Dr. Ricardo Lima', role: 'doctor' }} title="ANA — Seu Consultório" />
        <main className="flex-1 overflow-y-auto px-6 py-6">

          {/* ANA status hero */}
          <div className={`relative rounded-3xl p-6 mb-6 overflow-hidden border transition-all ${
            anaAtiva
              ? 'bg-gradient-to-r from-[#7B3FE4]/15 to-[#3B82F6]/10 border-[#7B3FE4]/30'
              : 'bg-[#111113] border-[#1C1C1E]'
          }`}>
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#7B3FE4]/10 blur-[60px]" />
            <div className="relative z-10 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                  anaAtiva
                    ? 'bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] shadow-[0_0_25px_rgba(123,63,228,0.4)]'
                    : 'bg-[#18181A] border border-[#27272A]'
                }`}>
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-white">ANA</h2>
                    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      anaAtiva
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : 'text-[#71717A] bg-[#18181A] border-[#27272A]'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${anaAtiva ? 'bg-emerald-400 animate-pulse' : 'bg-[#52525B]'}`} />
                      {anaAtiva ? 'Ativa' : 'Pausada'}
                    </div>
                  </div>
                  <p className="text-sm text-[#71717A]">Atendendo <span className="text-white font-medium">{anaConfig.produto}</span> · {anaConfig.padrao}</p>
                  <p className="text-xs text-[#52525B] mt-0.5">{anaConfig.numero} · {anaConfig.horario}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-[#111113]/80 border border-[#1C1C1E] rounded-xl px-4 py-2 text-center">
                  <p className="text-lg font-bold text-[#7B3FE4]">{anaConfig.respostas_hoje}</p>
                  <p className="text-[10px] text-[#71717A]">msgs hoje</p>
                </div>
                <button
                  onClick={() => setAnaAtiva(!anaAtiva)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    anaAtiva
                      ? 'bg-[#18181A] border border-[#27272A] text-[#71717A] hover:text-white hover:border-[#52525B]'
                      : 'bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white shadow-[0_0_15px_rgba(123,63,228,0.3)]'
                  }`}
                >
                  {anaAtiva ? <><Pause className="w-4 h-4" /> Pausar</> : <><Play className="w-4 h-4" /> Ativar</>}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {stats.map((s, i) => (
              <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <p className="text-sm text-[#71717A] mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className={`text-xs mt-1 flex items-center gap-1 ${s.up ? 'text-emerald-400' : 'text-red-400'}`}>
                  <ArrowUpRight className="w-3 h-3" />{s.trend}
                </p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">

            {/* Recent leads */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#7B3FE4]" /> Leads Recentes da ANA
                </h3>
                <a href="/medical/consultorio" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1">
                  Ver todos <ChevronRight className="w-3 h-3" />
                </a>
              </div>
              <div className="space-y-2">
                {recentLeads.map((lead, i) => {
                  const s = statusMap[lead.status]
                  return (
                    <div key={i} className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4 flex items-center gap-4 hover:border-[#7B3FE4]/20 transition-all group">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7B3FE4]/20 to-[#3B82F6]/20 flex items-center justify-center flex-shrink-0 text-sm font-bold text-[#9558EE]">
                        {lead.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-white text-sm">{lead.name}</p>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>{s.label}</span>
                        </div>
                        <p className="text-xs text-[#71717A] mt-0.5">{lead.stage}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-[#52525B]">{lead.time}</p>
                        <div className="flex items-center gap-1 mt-1 justify-end">
                          <Phone className="w-3 h-3 text-[#52525B]" />
                          <span className="text-[10px] text-[#52525B]">{lead.phone}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right */}
            <div className="space-y-4">

              {/* Funil visual */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#7B3FE4]" /> Funil Hoje
                </h3>
                <div className="space-y-2">
                  {[
                    { stage: 'Iniciaram conversa', count: 31, pct: 100, color: 'bg-[#3B82F6]' },
                    { stage: 'Qualificados', count: 21, pct: 68, color: 'bg-[#7B3FE4]' },
                    { stage: 'Interessados', count: 14, pct: 45, color: 'bg-[#9558EE]' },
                    { stage: 'Agendaram', count: 7, pct: 23, color: 'bg-emerald-500' },
                  ].map((f, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#A1A1AA]">{f.stage}</span>
                        <span className="text-white font-medium">{f.count}</span>
                      </div>
                      <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${f.color}`} style={{ width: `${f.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick actions */}
              <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-4">
                <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" /> Ações Rápidas
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'Ver conversas completas', icon: <MessageSquare className="w-4 h-4" />, href: '#' },
                    { label: 'Configurar contexto da ANA', icon: <Settings className="w-4 h-4" />, href: '/admin/agente' },
                    { label: 'Relatório de performance', icon: <BarChart3 className="w-4 h-4" />, href: '/medical/consultorio' },
                    { label: 'Leads sem resposta', icon: <AlertCircle className="w-4 h-4" />, href: '#' },
                  ].map((a, i) => (
                    <a key={i} href={a.href}
                      className="flex items-center gap-3 text-sm text-[#71717A] hover:text-white py-2 px-3 rounded-xl hover:bg-[#18181A] transition-all group">
                      <span className="text-[#52525B] group-hover:text-[#7B3FE4] transition-colors">{a.icon}</span>
                      {a.label}
                      <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Unique value prop */}
              <div className="bg-gradient-to-br from-[#7B3FE4]/10 to-[#3B82F6]/10 border border-[#7B3FE4]/20 rounded-2xl p-4">
                <div className="flex items-start gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-[#7B3FE4] flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-semibold text-white">Diferencial exclusivo da sua mentoria</p>
                </div>
                <p className="text-xs text-[#71717A] leading-relaxed">Você é o único médico mentorado com uma IA vendendo por você 24h. Enquanto outros médicos precisam fazer marketing, a ANA qualifica e agenda automaticamente.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
