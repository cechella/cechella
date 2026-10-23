import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET /api/admin/verve/posts — lista posts com filtro opcional de status
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const semana = searchParams.get('semana') // YYYY-WW

  let query = supabase
    .from('verve_posts')
    .select('*')
    .order('scheduled_at', { ascending: true })

  if (status) query = query.eq('status', status)
  if (semana) {
    // filtra pela semana ISO — simplificado: filtra por 7 dias a partir da segunda
    const [year, week] = semana.split('-W').map(Number)
    const jan4 = new Date(year, 0, 4)
    const startOfWeek = new Date(jan4)
    startOfWeek.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 7)
    query = query
      .gte('scheduled_at', startOfWeek.toISOString())
      .lt('scheduled_at', endOfWeek.toISOString())
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ posts: data })
}

// POST /api/admin/verve/posts — cria novo post na fila
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response
  const body = await req.json()
  const { tipo, titulo, legenda, pilar, scheduled_at, image_urls, slides } = body

  if (!tipo || !titulo || !scheduled_at) {
    return NextResponse.json({ error: 'tipo, titulo e scheduled_at são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('verve_posts')
    .insert({
      tipo,
      titulo,
      legenda: legenda ?? '',
      pilar: pilar ?? 'autoridade',
      scheduled_at,
      image_urls: image_urls ?? [],
      slides: slides ?? null,
      status: 'rascunho',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data }, { status: 201 })
}

// PATCH /api/admin/verve/posts — atualiza status e opcionalmente scheduled_at
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response
  const body = await req.json()
  const { id, status, scheduled_at } = body

  const allowed = ['rascunho', 'aguardando', 'aprovado', 'recusado', 'erro']
  if (!id || !allowed.includes(status)) {
    return NextResponse.json({ error: 'id e status válido são obrigatórios' }, { status: 400 })
  }

  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
  if (scheduled_at && !isNaN(Date.parse(scheduled_at))) update.scheduled_at = scheduled_at

  const { data, error } = await supabase
    .from('verve_posts')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ post: data })
}
