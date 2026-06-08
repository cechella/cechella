'use client'

import { Bell, Search, Settings, ChevronDown } from 'lucide-react'
import { RoleBadge } from '../ui/Badge'

interface TopBarProps {
  user?: {
    name: string
    role: 'patient' | 'doctor' | 'sales' | 'admin'
    avatar?: string
  }
  title?: string
  notifications?: number
}

export function TopBar({ user, title, notifications = 3 }: TopBarProps) {
  const defaultUser = { name: 'Dr. Ana Costa', role: 'doctor' as const }
  const u = user || defaultUser

  return (
    <header className="h-16 bg-[#111113]/80 backdrop-blur-xl border-b border-[#1C1C1E] flex items-center justify-between px-6 sticky top-0 z-50">
      {/* Left: Title */}
      <div>
        {title && <h1 className="text-base font-semibold text-white">{title}</h1>}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <button className="w-9 h-9 rounded-xl bg-[#18181A] border border-[#1C1C1E] flex items-center justify-center text-[#71717A] hover:text-white hover:border-[#27272A] transition-all">
          <Search className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-xl bg-[#18181A] border border-[#1C1C1E] flex items-center justify-center text-[#71717A] hover:text-white hover:border-[#27272A] transition-all">
          <Bell className="w-4 h-4" />
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-[#7B3FE4] to-[#3B82F6] text-white text-[9px] font-bold flex items-center justify-center">
              {notifications}
            </span>
          )}
        </button>

        {/* User menu */}
        <div className="flex items-center gap-2 pl-3 border-l border-[#1C1C1E]">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7B3FE4] to-[#3B82F6] flex items-center justify-center text-white text-xs font-bold shadow-[0_0_10px_rgba(123,63,228,0.3)]">
            {u.name.charAt(0)}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-white leading-none mb-0.5">{u.name}</p>
            <RoleBadge role={u.role} />
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#71717A]" />
        </div>
      </div>
    </header>
  )
}
