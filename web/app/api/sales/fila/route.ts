import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = db()

  const { data: comercial } = await supabase
    .from('comerciais')
    .select('id')
    .eq('email', user.email)
    .single()

  if (!comercial) return NextResponse.json({ fila: [], stats: { fechados: 0, ranking: 1, totalComerciais: 1, comissao: 0, fechadosPorDia: [] } })

  const myId = comercial.id

  // Fila: referidos assigned to me, not yet closed
  const { data: fila } = await supabase
    .from('contatos_referidos')
    .select('id, nome, telefone, profissao, hobby, status, indicado_por_nome, created_at, assigned_comercial_id')
    .eq('assigned_comercial_id', myId)
    .neq('status', 'fechado')
    .order('created_at', { ascending: true })

  // My fechados this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0)

  const { data: fechadosMes } = await supabase
    .from('contatos_referidos')
    .select('id, created_at')
    .eq('assigned_comercial_id', myId)
    .eq('status', 'fechado')
    .gte('created_at', startOfMonth.toISOString())

  const fechados = (fechadosMes ?? []).length
  const comissao = fechados * 600

  // Fechamentos per day (last 7 days) for chart
  const fechadosPorDia: number[] = Array(7).fill(0)
  const now = Date.now()
  for (const f of (fechadosMes ?? [])) {
    const daysAgo = Math.floor((now - new Date(f.created_at).getTime()) / 86400000)
    if (daysAgo < 7) fechadosPorDia[6 - daysAgo]++
  }

  // Ranking: count all comerciais fechados this month
  const { data: allFechados } = await supabase
    .from('contatos_referidos')
    .select('assigned_comercial_id')
    .eq('status', 'fechado')
    .not('assigned_comercial_id', 'is', null)
    .gte('created_at', startOfMonth.toISOString())

  const countByComercial: Record<string, number> = {}
  for (const r of (allFechados ?? [])) {
    const cid = r.assigned_comercial_id
    if (cid) countByComercial[cid] = (countByComercial[cid] || 0) + 1
  }

  const sorted = Object.entries(countByComercial).sort((a, b) => b[1] - a[1])
  const rankIdx = sorted.findIndex(([id]) => id === myId)
  const ranking = rankIdx === -1 ? sorted.length + 1 : rankIdx + 1
  const totalComerciais = Math.max(sorted.length, 1)

  const res = NextResponse.json({
    fila: fila ?? [],
    stats: { fechados, ranking, totalComerciais, comissao, fechadosPorDia },
  })
  res.headers.set('Cache-Control', 'no-store')
  return res
}

// PATCH: mark contato_referido as fechado or contatado
export async function PATCH(req: NextRequest) {
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, status } = await req.json()
  const supabase = db()
  const { error } = await supabase
    .from('contatos_referidos')
    .update({ status })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
