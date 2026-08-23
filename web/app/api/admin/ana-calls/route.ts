import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function PATCH(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const body = await req.json()
  const { call_sid, status, assigned_comercial_id } = body
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (status !== undefined) patch.status = status
  if (assigned_comercial_id !== undefined) patch.assigned_comercial_id = assigned_comercial_id
  const { error } = await supabase
    .from('ana_calls')
    .update(patch)
    .eq('call_sid', call_sid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const status = req.nextUrl.searchParams.get('status')
  const active = req.nextUrl.searchParams.get('active')

  let query = supabase
    .from('ana_calls')
    .select('id, call_sid, telefone, stage, status, gates_passed, memories, created_at, updated_at, em_ligacao, assigned_comercial_id')
    .order('created_at', { ascending: false })
    .limit(50)

  if (status) query = query.eq('status', status)
  // Pipeline mode: show all unresolved calls (active status), not just live ones.
  // em_ligacao=true → ao vivo; em_ligacao=false + status=active → pendente (call ended, needs follow-up)
  if (active === 'true') query = query.eq('status', 'active')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const calls = data ?? []

  // Enrich with lead name from leads table
  if (calls.length > 0) {
    const phones = calls.map((c: any) => c.telefone).filter(Boolean)
    const variants = phones.flatMap((t: string) => [t, `55${t}`, t.replace(/^55/, '')])
    const { data: leads } = await supabase
      .from('leads')
      .select('nome, telefone')
      .in('telefone', Array.from(new Set(variants)))
    const leadMap: Record<string, string> = {}
    if (leads) {
      leads.forEach((l: any) => {
        if (l.nome && l.telefone) leadMap[l.telefone] = l.nome
      })
    }
    calls.forEach((c: any) => {
      const t = c.telefone as string
      c.nome = leadMap[t] ?? leadMap[`55${t}`] ?? leadMap[t?.replace(/^55/, '')] ?? null
    })
  }

  const res = NextResponse.json(calls)
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.headers.set('Pragma', 'no-cache')
  return res
}
