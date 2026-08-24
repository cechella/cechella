'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter, usePathname } from 'next/navigation'
import SalesShell from '@/components/sales/SalesShell'

let sb: ReturnType<typeof createBrowserClient> | null = null
function getSupabase() {
  if (!sb) sb = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return sb
}

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const isLogin = pathname === '/sales/login'

  useEffect(() => {
    const supabase = getSupabase()
    supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => {
      if (!data.session && !isLogin) {
        router.replace('/sales/login')
      } else {
        setChecking(false)
      }
    })
  }, [pathname, router, isLogin])

  if (checking && !isLogin) {
    return (
      <div className="min-h-screen bg-[#09090B] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isLogin) return <>{children}</>

  return <SalesShell>{children}</SalesShell>
}
