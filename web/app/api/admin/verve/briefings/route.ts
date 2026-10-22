import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function isServiceKey(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
}

// GET /api/admin/verve/briefings — lista briefings (uso interno do admin, sem auth de sessão aqui pois chamado server-side)
export async function GET() {
  const { data, error } = await supabase
    .from('verve_briefings')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ briefings: data })
}

// POST /api/admin/verve/briefings — Gustavo cria proposta (service key) ou admin cria manualmente
export async function POST(req: NextRequest) {
  if (!isServiceKey(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { titulo, objetivo, publico_alvo, pilar, gatilho_manychat, semana, posts } = body

  if (!titulo || !objetivo || !semana) {
    return NextResponse.json({ error: 'titulo, objetivo e semana são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('verve_briefings')
    .insert({
      titulo,
      objetivo,
      publico_alvo: publico_alvo ?? '',
      pilar: pilar ?? 'autoridade',
      gatilho_manychat: gatilho_manychat ?? '',
      semana,
      posts: posts ?? [],
      status: 'proposta',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ briefing: data }, { status: 201 })
}

// PATCH /api/admin/verve/briefings — CEO aprova ou recusa + gera rascunhos
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, status } = body

  if (!id || !['aprovado', 'recusado'].includes(status)) {
    return NextResponse.json({ error: 'id e status (aprovado|recusado) são obrigatórios' }, { status: 400 })
  }

  const { data: briefing, error: bErr } = await supabase
    .from('verve_briefings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })

  // Ao aprovar: gera rascunhos de post a partir do plano da semana
  if (status === 'aprovado' && Array.isArray(briefing.posts) && briefing.posts.length > 0) {
    const rascunhos = briefing.posts.map((p: { tipo: string; tema: string; pilar: string; scheduled_at: string }) => ({
      tipo: p.tipo ?? 'carrossel',
      titulo: p.tema,
      legenda: '',
      pilar: p.pilar ?? briefing.pilar,
      scheduled_at: p.scheduled_at,
      image_urls: [],
      slides: p.tipo === 'carrossel' ? 8 : null,
      status: 'rascunho',
      briefing_id: briefing.id,
    }))

    await supabase.from('verve_posts').insert(rascunhos)
  }

  return NextResponse.json({ briefing })
}
