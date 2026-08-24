'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

type Me = { nome: string; cargo?: string }

const NAV_MAIN = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/sales/dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1.5" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'crm',
    label: 'Leads / CRM',
    href: '/sales/crm',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="3" width="4" height="10" rx="1" />
        <rect x="6" y="1" width="4" height="12" rx="1" />
        <rect x="11" y="5" width="4" height="8" rx="1" />
      </svg>
    ),
  },
]

const NAV_DEV = [
  {
    id: 'training',
    label: 'Treinamentos',
    href: '/sales/training',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6.5" />
        <polyline points="5.5,8.5 7,10 10.5,6.5" />
      </svg>
    ),
  },
  {
    id: 'ranking',
    label: 'Ranking',
    href: '/sales/ranking',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polyline points="1,12 5,7 8,9 11,5 15,8" />
        <circle cx="5" cy="7" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="11" cy="5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

const NAV_ACCOUNT = [
  {
    id: 'perfil',
    label: 'Meu Perfil',
    href: '/sales/perfil',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="5" r="3" />
        <path d="M1.5 14.5c0-3.314 2.91-6 6.5-6s6.5 2.686 6.5 6" strokeLinecap="round" />
      </svg>
    ),
  },
]

function getInitials(nome: string) {
  return nome.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function getPageTitle(pathname: string): { title: string; sub: string } {
  if (pathname.startsWith('/sales/crm')) return { title: 'Leads / CRM', sub: 'Funil de vendas' }
  if (pathname.startsWith('/sales/training')) return { title: 'Treinamentos', sub: 'Sales Academy' }
  if (pathname.startsWith('/sales/ranking')) return { title: 'Ranking', sub: 'Este mês' }
  if (pathname.startsWith('/sales/perfil')) return { title: 'Meu Perfil', sub: 'Dados e configurações' }
  return { title: 'Dashboard', sub: 'Seus leads em tempo real' }
}

let sb: ReturnType<typeof createBrowserClient> | null = null
function getSupabase() {
  if (!sb) sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return sb
}

export default function SalesShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [me, setMe] = useState<Me | null>(null)
  const { title, sub } = getPageTitle(pathname)

  useEffect(() => {
    fetch('/api/sales/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMe(data) })
  }, [])

  async function handleSignOut() {
    await getSupabase().auth.signOut()
    router.replace('/sales/login')
  }

  function NavItem({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
    const active = pathname.startsWith(href)
    return (
      <Link
        href={href}
        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-[13px] font-medium transition-all ${
          active
            ? 'bg-[#7C3AED]/12 text-[#A78BFA]'
            : 'text-[#71717A] hover:bg-[#18181B] hover:text-[#FAFAFA]'
        }`}
      >
        <span className="w-4 h-4 flex-shrink-0">{icon}</span>
        {label}
      </Link>
    )
  }

  return (
    <div className="flex h-screen bg-[#09090B] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[220px] flex-shrink-0 bg-[#111113] border-r border-[#27272A] flex flex-col overflow-hidden">
        {/* Logo */}
        <div className="px-[18px] py-5 border-b border-[#27272A]">
          <div className="flex items-center gap-2">
            <div className="w-[30px] h-[30px] rounded-[8px] bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] flex items-center justify-center text-sm font-black text-white">
              H
            </div>
            <div>
              <p className="text-[12px] font-bold text-[#FAFAFA] tracking-[.4px] leading-none">HORMONE</p>
              <p className="text-[10px] text-[#71717A] tracking-[.3px] leading-none mt-0.5">ECOSYSTEM</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 flex flex-col gap-0.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-[#52525B] tracking-[.8px] uppercase px-2 pb-1">Principal</p>
          {NAV_MAIN.map(n => <NavItem key={n.id} {...n} />)}

          <p className="text-[10px] font-semibold text-[#52525B] tracking-[.8px] uppercase px-2 pb-1 mt-3">Desenvolvimento</p>
          {NAV_DEV.map(n => <NavItem key={n.id} {...n} />)}

          <p className="text-[10px] font-semibold text-[#52525B] tracking-[.8px] uppercase px-2 pb-1 mt-3">Conta</p>
          {NAV_ACCOUNT.map(n => <NavItem key={n.id} {...n} />)}
        </nav>

        {/* Footer */}
        <div className="px-2.5 pb-3 border-t border-[#27272A] pt-3">
          <button
            onClick={() => router.push('/sales/perfil')}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] hover:bg-[#18181B] transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
              {me ? getInitials(me.nome) : '–'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[#FAFAFA] truncate">{me?.nome ?? '…'}</p>
              <p className="text-[10px] text-[#71717A] truncate">{me?.cargo ?? 'Consultor'}</p>
            </div>
            <span className="text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-full px-1.5 py-0.5">
              Nv 2
            </span>
          </button>
          <button
            onClick={handleSignOut}
            className="w-full mt-1 text-[11px] text-[#52525B] hover:text-[#71717A] transition-colors px-2.5 py-1 text-left"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="h-[52px] flex-shrink-0 border-b border-[#27272A] flex items-center gap-3 px-5">
          <span className="text-[15px] font-semibold text-[#FAFAFA]">{title}</span>
          <span className="text-[12px] text-[#71717A]">{sub}</span>
          <div className="ml-auto flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] border border-[#27272A] bg-[#18181B] flex items-center justify-center relative">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#71717A" strokeWidth="1.5">
                <path d="M7 1a4 4 0 0 1 4 4c0 3 1.5 4 1.5 4h-11S3 8 3 5a4 4 0 0 1 4-4z" />
                <path d="M5.5 9s.5 2 1.5 2 1.5-2 1.5-2" />
              </svg>
              <span className="w-[7px] h-[7px] rounded-full bg-[#7C3AED] border-[1.5px] border-[#111113] absolute top-[5px] right-[5px]" />
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  )
}
