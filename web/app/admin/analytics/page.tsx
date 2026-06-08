'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { StatsCard } from '@/components/ui/StatsCard'
import { Users, TrendingUp, Play, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'

const dateRanges = ['Últimos 7 dias', 'Últimos 30 dias', 'Últimos 90 dias', 'Este ano']

const engagementData = [
  { day: 'Seg', sessions: 420, videos: 180, articles: 95 },
  { day: 'Ter', sessions: 380, videos: 165, articles: 80 },
  { day: 'Qua', sessions: 510, videos: 220, articles: 110 },
  { day: 'Qui', sessions: 490, videos: 210, articles: 105 },
  { day: 'Sex', sessions: 620, videos: 275, articles: 130 },
  { day: 'Sáb', sessions: 340, videos: 145, articles: 70 },
  { day: 'Dom', sessions: 280, videos: 120, articles: 55 },
]

const contentPerformance = [
  { title: 'Implantes Hormonais', views: 2847, completion: 78 },
  { title: 'Menopausa', views: 1923, completion: 82 },
  { title: 'TRT Masculino', views: 1756, completion: 74 },
  { title: 'Performance', views: 1234, completion: 69 },
  { title: 'Libido', views: 1102, completion: 88 },
]

const userGrowth = [
  { month: 'Jan', patients: 120, doctors: 18, consultants: 12 },
  { month: 'Fev', patients: 180, doctors: 24, consultants: 18 },
  { month: 'Mar', patients: 240, doctors: 31, consultants: 22 },
  { month: 'Abr', patients: 310, doctors: 38, consultants: 28 },
  { month: 'Mai', patients: 390, doctors: 46, consultants: 35 },
  { month: 'Jun', patients: 480, doctors: 55, consultants: 42 },
]

const conversionFunnel = [
  { name: 'Visitantes', value: 12840, fill: '#7B3FE4' },
  { name: 'Leads', value: 892, fill: '#3B82F6' },
  { name: 'Qualificados', value: 412, fill: '#06B6D4' },
  { name: 'Consultas', value: 198, fill: '#10B981' },
  { name: 'Conversões', value: 87, fill: '#F59E0B' },
]

const kpis = [
  { title: 'Sessões (semana)', value: '3.040', icon: <Users className="w-5 h-5" />, trend: { value: 12 } },
  { title: 'Taxa de Retenção', value: '68.4%', icon: <TrendingUp className="w-5 h-5" />, trend: { value: 3.2 } },
  { title: 'Vídeos Completados', value: '1.248', icon: <Play className="w-5 h-5" />, trend: { value: 8 } },
  { title: 'Receita (mês)', value: 'R$ 284k', icon: <DollarSign className="w-5 h-5" />, trend: { value: 15 } },
]

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('Últimos 7 dias')

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin Master', role: 'admin' }} title="Analytics" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Date range */}
          <div className="flex gap-2 mb-6">
            {dateRanges.map(r => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`text-xs font-medium px-4 py-2 rounded-xl border transition-all ${
                  dateRange === r
                    ? 'bg-[#7B3FE4]/15 border-[#7B3FE4]/30 text-white'
                    : 'bg-[#111113] border-[#1C1C1E] text-[#71717A] hover:text-white hover:border-[#27272A]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {kpis.map((kpi, i) => (
              <StatsCard key={i} {...kpi} />
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Engagement */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-5">Engajamento por Dia</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={engagementData}>
                  <defs>
                    <linearGradient id="gSessions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7B3FE4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7B3FE4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gVideos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1C1C1E" />
                  <XAxis dataKey="day" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 10, color: '#fff', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#A1A1AA' }} />
                  <Area type="monotone" dataKey="sessions" name="Sessões" stroke="#7B3FE4" fill="url(#gSessions)" strokeWidth={2} />
                  <Area type="monotone" dataKey="videos" name="Vídeos" stroke="#3B82F6" fill="url(#gVideos)" strokeWidth={2} />
                  <Line type="monotone" dataKey="articles" name="Artigos" stroke="#06B6D4" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* User growth */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-5">Crescimento de Usuários</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={userGrowth} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1C1C1E" />
                  <XAxis dataKey="month" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 10, color: '#fff', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#A1A1AA' }} />
                  <Bar dataKey="patients" name="Pacientes" fill="#7B3FE4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="doctors" name="Médicos" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="consultants" name="Consultores" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Conversion funnel */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-5">Funil de Conversão</h3>
              <div className="space-y-3">
                {conversionFunnel.map((item, i) => {
                  const pct = Math.round(item.value / conversionFunnel[0].value * 100)
                  const convRate = i > 0 ? Math.round(item.value / conversionFunnel[i - 1].value * 100) : 100
                  return (
                    <div key={item.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-[#A1A1AA]">{item.name}</span>
                        <div className="flex items-center gap-3">
                          {i > 0 && (
                            <span className={`text-xs font-medium flex items-center gap-0.5 ${convRate >= 50 ? 'text-emerald-400' : 'text-[#71717A]'}`}>
                              {convRate >= 50 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {convRate}%
                            </span>
                          )}
                          <span className="font-bold text-white">{item.value.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                      <div className="h-7 bg-[#18181A] rounded-xl overflow-hidden">
                        <div
                          className="h-full rounded-xl transition-all duration-700 flex items-center px-3"
                          style={{ width: `${pct}%`, background: item.fill }}
                        >
                          <span className="text-xs font-bold text-white whitespace-nowrap">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Content performance */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-5">Performance de Conteúdo</h3>
              <div className="space-y-4">
                {contentPerformance.map((content) => (
                  <div key={content.title}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-[#A1A1AA] font-medium">{content.title}</span>
                      <div className="flex items-center gap-4 text-xs text-[#71717A]">
                        <span>{content.views.toLocaleString('pt-BR')} views</span>
                        <span className="font-bold text-emerald-400">{content.completion}% comp.</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] text-[#52525B] mb-0.5">Visualizações</p>
                        <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6]"
                            style={{ width: `${Math.round(content.views / contentPerformance[0].views * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] text-[#52525B] mb-0.5">Taxa de conclusão</p>
                        <div className="h-1.5 bg-[#1C1C1E] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${content.completion}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
