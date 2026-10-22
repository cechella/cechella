import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { decideAdmin } from './admin-core'

export type AdminCheck = { ok: true; userId: string } | { ok: false; response: NextResponse }

// As rotas /api/admin/* NÃO passam pelo middleware (o matcher só cobre /admin/*): cada handler do VERVE chama esta função.
export async function requireAdmin(req: NextRequest): Promise<AdminCheck> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const decision = await decideAdmin({
    getUserId: async () => {
      const supabase = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} },
      })
      const { data } = await supabase.auth.getUser()
      return data.user?.id ?? null
    },
    getRole: async (userId) => {
      const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data } = await admin.from('profiles').select('role').eq('id', userId).single()
      return (data?.role as string | undefined) ?? null
    },
  })
  if (decision.ok) return { ok: true, userId: decision.userId }
  return { ok: false, response: NextResponse.json({ error: decision.error }, { status: decision.status }) }
}
