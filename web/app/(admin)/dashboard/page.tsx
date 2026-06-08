'use client'

import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { StatsCard } from '@/components/ui/StatsCard'
import { Badge } from '@/components/ui/Badge'
import {
  Users, Play, TrendingUp, DollarSign, ChevronRight, Zap,
  UserPlus, Activity, Settings
} from 'lucide-react'
import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

const activityData = [
  { month: 'Jan', patients: 240, doctors: 48, consultants: 31 },
  { month: 'Fev', patients: 290, doctors: 52, consultants: 38 },
  { month: 'Mar', patients: 380, doctors: 61, consultants: 44 },
  { month: 'Abr', patients: 420, doctors: 67, consultants: 52 },
  { month: 'Mai', patients: 510, doctors: 74, consultants: 61 },
  { month: 'Jun', patients: 620, doctors: 82, consultants: 68 },
]

const userBreakdown = [
  { name: 'Pacientes', value: 2847, color: '#7B3FE4' },
  { name: 'Médicos', value: 284, color: '#3B82F6' },
  { name: 'Consultores', value: 146, color: '#06B6D4' },
  { name: 'Leads', value: 892, color: '#F59E0B' },
]

const recentRegistrations = [
  { name: 'Dr. Paulo Silva', role: 'doctor' as const, email: 'paulo.silva@email.com', joined: 'há 2h', status: 'Ativo' },
  { name: 'Maria Fernanda L.', role: 'patient' as const, email: 'mfl@email.com', joined: 'há 4h', status: 'Ativo' },
  { name: 'Carlos Mendes', role: 'sales' as const, email: 'carlos.m@email.com', joined: 'há 6h', status: 'Pendente' },
  { name: 'Dra. Ana Beatriz', role: 'doctor' as const, email: 'ana.b@email.com', joined: 'Ontem', status: 'Ativo' },
  { name: 'Roberto Alves', role: 'patient' as const, email: 'roberto.a@email.com', joined: 'Ontem', status: 'Ativo' },
]

const quickActions = [
  { label: 'Novo Usuário', icon: <UserPlus className="w-4 h-4" />, href: '/admin/users', color: 'text-[#7B3FE4]' },
  { label: 'Upload Vídeo', icon: <Play className="w-4 h-4" />, href: '/admin/content', color: 'text-[#3B82F6]' },
  { label: 'Analytics', icon: <Activity className="w-4 h-4" />, href: '/admin/analytics', color: 'text-[#06B6D4]' },
  { label: 'Configurações', icon: <Settings className="w-4 h-4" />, href: '/settings', color: 'text-[#71717A]' },
]

export default function AdminDashboard() {
  const totalUsers = userBreakdown.reduce((acc, u) => acc + u.value, 0)

  return (
    <div className="flex h-screen bg-[#0A0A0B] overflow-hidden">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={{ name: 'Admin Master', role: 'admin' }} title="Painel Administrativo" />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-[#7B3FE4]/10 via-[#3B82F6]/10 to-[#06B6D4]/10 border border-[#7B3FE4]/20 rounded-3xl p-5 mb-6 overflow-hidden">
            <div className="absolute inset-0" style={{
              backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(123,63,228,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(59,130,246,0.1) 0%, transparent 50%)',
            }} />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-400">Sistema operacional</span>
                </div>
                <h2 className="text-xl font-bold text-white">Admin Master — Hormone Ecosystem</h2>
                <p className="text-sm text-[#71717A]">Visão geral da plataforma em tempo real</p>
              </div>
              <div className="flex gap-2">
                {quickActions.map((action) => (
                  <a
                    key={action.label}
                    href={action.href}
                    className="flex items-center gap-1.5 text-xs font-medium bg-[#111113] border border-[#1C1C1E] px-3 py-2 rounded-xl hover:border-[#27272A] hover:text-white transition-all text-[#A1A1AA]"
                  >
                    <span className={action.color}>{action.icon}</span>
                    {action.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <StatsCard title="Total Usuários" value={totalUsers.toLocaleString('pt-BR')} icon={<Users className="w-5 h-5" />} trend={{ value: 12 }} />
            <StatsCard title="Leads Ativos" value="892" icon={<Zap className="w-5 h-5" />} trend={{ value: 18 }} />
            <StatsCard title="Horas de Vídeo" value="14.2k" icon={<Play className="w-5 h-5" />} trend={{ value: 8 }} />
            <StatsCard title="Conversões" value="342" icon={<TrendingUp className="w-5 h-5" />} trend={{ value: 22 }} />
            <StatsCard title="MRR" value="R$ 284k" icon={<DollarSign className="w-5 h-5" />} trend={{ value: 15 }} gradient />
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            {/* Activity chart */}
            <div className="lg:col-span-2 bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#7B3FE4]" /> Crescimento de Usuários
                </h3>
                <a href="/admin/analytics" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1 transition-colors">
                  Ver analytics <ChevronRight className="w-3 h-3" />
                </a>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="gradPatients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7B3FE4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7B3FE4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradDoctors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1C1C1E" />
                  <XAxis dataKey="month" tick={{ fill: '#71717A', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717A', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 12, color: '#fff' }}
                    itemStyle={{ color: '#A1A1AA' }}
                  />
                  <Area type="monotone" dataKey="patients" name="Pacientes" stroke="#7B3FE4" fill="url(#gradPatients)" strokeWidth={2} />
                  <Area type="monotone" dataKey="doctors" name="Médicos" stroke="#3B82F6" fill="url(#gradDoctors)" strokeWidth={2} />
                  <Line type="monotone" dataKey="consultants" name="Consultores" stroke="#06B6D4" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* User breakdown pie */}
            <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-5 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#7B3FE4]" /> Usuários por Tipo
              </h3>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={userBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {userBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#111113', border: '1px solid #1C1C1E', borderRadius: 8, color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {userBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-[#A1A1AA]">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{item.value.toLocaleString('pt-BR')}</span>
                      <span className="text-xs text-[#52525B]">({Math.round(item.value / totalUsers * 100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent registrations */}
          <div className="bg-[#111113] border border-[#1C1C1E] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#7B3FE4]" /> Cadastros Recentes
              </h3>
              <a href="/admin/users" className="text-xs text-[#7B3FE4] hover:text-[#9558EE] flex items-center gap-1 transition-colors">
                Ver todos <ChevronRight className="w-3 h-3" />
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1C1C1E]">
                    {['Usuário', 'Tipo', 'E-mail', 'Cadastro', 'Status'].map(h => (
                      <th key={h} className="pb-3 text-left text-xs font-medium text-[#52525B] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentRegistrations.map((user, i) => (
                    <tr key={i} className="border-b border-[#1C1C1E]/50 last:border-0 hover:bg-[#18181A] transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7B3FE4]/20 to-[#3B82F6]/20 flex items-center justify-center text-xs font-bold text-[#7B3FE4]">
                            {user.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-white">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4"><Badge variant={user.role === 'doctor' ? 'blue' : user.role === 'sales' ? 'green' : 'purple'} size="sm">{user.role === 'doctor' ? 'Médico' : user.role === 'sales' ? 'Consultor' : 'Paciente'}</Badge></td>
                      <td className="py-3 pr-4 text-sm text-[#71717A]">{user.email}</td>
                      <td className="py-3 pr-4 text-sm text-[#52525B]">{user.joined}</td>
                      <td className="py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          user.status === 'Ativo' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
