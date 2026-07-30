'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  LayoutDashboard,
  Play,
  BookOpen,
  FileText,
  GraduationCap,
  Library,
  Users,
  Award,
  BarChart3,
  Kanban,
  Trophy,
  Settings,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  MessageSquare,
  FlaskConical,
  Network,
  Bot,
  Share2,
  TrendingUp,
  TestTube2,
  DollarSign,
  Package,
  Star,
  Stethoscope,
  Building2,
  CreditCard,
  RefreshCw,
} from 'lucide-react'

type UserRole = 'patient' | 'medical' | 'sales' | 'admin'

interface SidebarProps {
  role?: UserRole
}

const navConfig: Record<UserRole, { label: string; href: string; icon: React.ReactNode }[]> = {
  patient: [
    { label: 'Dashboard', href: '/patient/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Vídeos', href: '/patient/videos', icon: <Play className="w-5 h-5" /> },
    { label: 'Evidência Científica', href: '/patient/evidencia', icon: <FlaskConical className="w-5 h-5" /> },
  ],
  medical: [
    { label: 'Dashboard', href: '/medical/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Financeiro', href: '/medical/financeiro', icon: <DollarSign className="w-5 h-5" /> },
    { label: 'CRM', href: '/medical/crm', icon: <Kanban className="w-5 h-5" /> },
    { label: 'Treinamento', href: '/medical/escola', icon: <GraduationCap className="w-5 h-5" /> },
    { label: 'Pacientes', href: '/medical/pacientes', icon: <Users className="w-5 h-5" /> },
    { label: 'Agente IA', href: '/medical/agente', icon: <Bot className="w-5 h-5" /> },
    { label: 'Referidos', href: '/medical/referidos', icon: <Share2 className="w-5 h-5" /> },
    { label: 'Analytics', href: '/medical/analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { label: 'Rede', href: '/medical/rede', icon: <Network className="w-5 h-5" /> },
    { label: 'Resultados', href: '/medical/resultados', icon: <TrendingUp className="w-5 h-5" /> },
    { label: 'Assinatura', href: '/medical/assinatura', icon: <CreditCard className="w-5 h-5" /> },
  ],
  sales: [
    { label: 'Dashboard', href: '/sales/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Treinamentos', href: '/sales/training', icon: <Dumbbell className="w-5 h-5" /> },
    { label: 'CRM', href: '/sales/crm', icon: <Kanban className="w-5 h-5" /> },
    { label: 'Ranking', href: '/sales/ranking', icon: <Trophy className="w-5 h-5" /> },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Financeiro', href: '/admin/financeiro', icon: <DollarSign className="w-5 h-5" /> },
    { label: 'CRM', href: '/admin/crm', icon: <Kanban className="w-5 h-5" /> },
    { label: 'Vídeos', href: '/admin/videos', icon: <Play className="w-5 h-5" /> },
    { label: 'Usuários', href: '/admin/users', icon: <Users className="w-5 h-5" /> },
    { label: 'Área do Paciente', href: '/admin/patient-settings', icon: <Settings className="w-5 h-5" /> },
    { label: 'Produtos', href: '/admin/produtos', icon: <Package className="w-5 h-5" /> },
    { label: 'Agente IA', href: '/admin/agente', icon: <Bot className="w-5 h-5" /> },
    { label: 'Referidos IA', href: '/admin/referidos', icon: <Share2 className="w-5 h-5" /> },
    { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { label: 'Rede', href: '/admin/rede', icon: <Network className="w-5 h-5" /> },
    { label: 'Resultados', href: '/admin/resultados', icon: <TrendingUp className="w-5 h-5" /> },
    { label: 'Teste', href: '/admin/teste', icon: <TestTube2 className="w-5 h-5" /> },
    { label: 'Configurações', href: '/admin/configuracoes', icon: <Settings className="w-5 h-5" /> },
    { label: 'Sistema', href: '/admin/sistema', icon: <RefreshCw className="w-5 h-5" /> },
  ],
}

const roleLabels: Record<UserRole, string> = {
  patient: 'Paciente',
  medical: 'Hormone Academy',
  sales: 'Sales Academy',
  admin: 'Admin Master',
}

const roleColors: Record<UserRole, string> = {
  patient: 'from-[#7B3FE4] to-[#9558EE]',
  medical: 'from-[#3B82F6] to-[#7B3FE4]',
  sales: 'from-[#06B6D4] to-[#3B82F6]',
  admin: 'from-[#F59E0B] to-[#EF4444]',
}

export function Sidebar({ role = 'patient' }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const navItems = navConfig[role]

  return (
    <aside className={`relative flex flex-col bg-[#111113] border-r border-[#1C1C1E] h-screen transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#1C1C1E]">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${roleColors[role]} flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(123,63,228,0.3)]`}>
          <Activity className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-xs font-bold tracking-[0.15em] text-white uppercase leading-none">Hormone</p>
            <p className="text-[10px] tracking-[0.2em] text-[#7B3FE4] uppercase font-medium leading-none mt-0.5">Ecosystem</p>
          </div>
        )}
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-3 py-3">
          <div className={`bg-gradient-to-r ${roleColors[role]} bg-opacity-10 rounded-xl px-3 py-2`} style={{ background: 'rgba(123,63,228,0.1)', border: '1px solid rgba(123,63,228,0.2)' }}>
            <p className="text-xs font-semibold text-[#9558EE] truncate">{roleLabels[role]}</p>
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-[#7B3FE4]/20 to-[#3B82F6]/10 text-white border border-[#7B3FE4]/20'
                  : 'text-[#71717A] hover:text-white hover:bg-[#18181A]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <span className={isActive ? 'text-[#7B3FE4]' : 'group-hover:text-[#A1A1AA] transition-colors'}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {!collapsed && isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#7B3FE4]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* CTA Implante — só para pacientes */}
      {role === 'patient' && !collapsed && (
        <div className="px-3 pb-2">
          <a
            href="https://wa.me/5547988507977?text=Ol%C3%A1%21+Quero+saber+mais+sobre+o+implante+hormonal."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-[#7B3FE4] to-[#9558EE] text-white text-xs font-bold py-3 rounded-xl hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(123,63,228,0.3)]"
          >
            ⚡ QUERO MEU IMPLANTE
          </a>
        </div>
      )}

      {/* Bottom */}
      <div className="border-t border-[#1C1C1E] p-2">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#71717A] hover:text-white hover:bg-[#18181A] transition-all duration-200 group"
          title={collapsed ? 'Configurações' : undefined}
        >
          <Settings className="w-5 h-5 group-hover:text-[#A1A1AA] transition-colors" />
          {!collapsed && <span className="text-sm font-medium">Configurações</span>}
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#18181A] border border-[#1C1C1E] flex items-center justify-center text-[#71717A] hover:text-white hover:border-[#7B3FE4] transition-all duration-200 z-10"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  )
}
