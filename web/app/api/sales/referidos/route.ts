import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Find comercial by auth email
  const { data: comercial } = await supabase
    .from('comerciais')
    .select('id')
    .eq('email', user.email)
    .single()

  if (!comercial) return NextResponse.json([])

  // Get ana_calls assigned to this comercial (not yet resolved)
  const { data: calls, error } = await supabase
    .from('ana_calls')
    .select('id, call_sid, telefone, stage, status, em_ligacao, created_at, updated_at, assigned_comercial_id')
    .eq('assigned_comercial_id', comercial.id)
    .neq('status', 'encerrado')
    .neq('status', 'ganho')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = calls ?? []

  // Enrich with lead name
  if (items.length > 0) {
    const phones = items.map((c: any) => c.telefone).filter(Boolean)
    const variants = phones.flatMap((t: string) => [t, `55${t}`, t.replace(/^55/, '')])
    const { data: leads } = await supabase
      .from('leads')
      .select('nome, telefone')
      .in('telefone', Array.from(new Set(variants)))
    const leadMap: Record<string, string> = {}
    if (leads) leads.forEach((l: any) => { if (l.nome && l.telefone) leadMap[l.telefone] = l.nome })
    items.forEach((c: any) => {
      const t = c.telefone as string
      c.nome = leadMap[t] ?? leadMap[`55${t}`] ?? leadMap[t?.replace(/^55/, '')] ?? null
    })
  }

  const res = NextResponse.json(items)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

// PATCH: mark a referido as resolved (ganho or encerrado)
export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { call_sid, status } = await req.json()
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { error } = await supabase
    .from('ana_calls')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('call_sid', call_sid)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
