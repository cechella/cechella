import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { atlasAuthorized } from '@/lib/verve/admin-core'
import { validateBriefingInput } from '@/lib/verve/briefing-input'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const MAX_BODY = 64 * 1024

// GET /api/admin/verve/briefings — lista (só administrador logado; o ATLAS lê o status de UM briefing com ?id=)
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (id && atlasAuthorized(process.env.VERVE_ATLAS_TOKEN, req.headers)) {
    const { data, error } = await supabase.from('verve_briefings').select('id,status').eq('id', id).single()
    if (error) return NextResponse.json({ error: 'nao_encontrado' }, { status: 404 })
    return NextResponse.json({ id: data.id, status: data.status })
  }
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response
  const { data, error } = await supabase
    .from('verve_briefings')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ briefings: data })
}

// POST /api/admin/verve/briefings — proposta do Gustavo. Token DEDICADO do ATLAS (VERVE_ATLAS_TOKEN) ou administrador logado.
// A chave de serviço do Supabase NÃO vale aqui: ela dá acesso total ao banco e não pode sair da Hormone.
export async function POST(req: NextRequest) {
  const viaAtlas = atlasAuthorized(process.env.VERVE_ATLAS_TOKEN, req.headers)
  if (!viaAtlas) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
  }
  const raw = await req.text()
  if (raw.length > MAX_BODY) return NextResponse.json({ error: 'corpo_grande_demais' }, { status: 413 })
  let body: unknown
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'json_invalido' }, { status: 400 }) }
  const v = validateBriefingInput(body)
  if (!v.ok) return NextResponse.json({ error: 'briefing_invalido', erros: v.erros }, { status: 422 })
  const b = v.value

  // Status e origem são definidos AQUI; nada disso vem do corpo da requisição.
  const { data, error } = await supabase
    .from('verve_briefings')
    .insert({
      titulo: b.titulo,
      objetivo: b.objetivo,
      publico_alvo: b.publico_alvo,
      pilar: b.pilar,
      gatilho_manychat: b.gatilho_manychat,
      semana: b.semana,
      posts: b.posts,
      status: 'proposta',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id, status: data.status, briefing: data, banner: 'Aguardando aprovação do CEO — nenhuma alteração aplicada' }, { status: 201 })
}

// PATCH /api/admin/verve/briefings — SÓ o administrador logado decide. Só decide uma proposta (nunca um briefing já decidido).
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => ({}))
  const { id, status } = body as { id?: string; status?: string }
  if (!id || !['aprovado', 'recusado'].includes(String(status))) {
    return NextResponse.json({ error: 'id e status (aprovado|recusado) são obrigatórios' }, { status: 400 })
  }

  const { data: briefing, error: bErr } = await supabase
    .from('verve_briefings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'proposta')
    .select()
    .single()

  if (bErr || !briefing) return NextResponse.json({ error: 'briefing_inexistente_ou_ja_decidido' }, { status: 409 })

  // Ao aprovar: os posts do plano viram rascunhos (re-validados: o que está no banco passa pelo mesmo filtro).
  let rascunhos = 0
  if (status === 'aprovado') {
    const v = validateBriefingInput({
      titulo: briefing.titulo, objetivo: briefing.objetivo, publico_alvo: briefing.publico_alvo, pilar: briefing.pilar,
      gatilho_manychat: briefing.gatilho_manychat ?? '', semana: briefing.semana, posts: briefing.posts,
    })
    if (!v.ok) return NextResponse.json({ briefing, error: 'plano_invalido_nao_gerou_rascunhos', erros: v.erros }, { status: 422 })
    const linhas = v.value.posts.map(p => ({
      tipo: p.tipo,
      titulo: p.tema,
      legenda: p.legenda ?? '',
      pilar: p.pilar,
      scheduled_at: p.scheduled_at,
      image_urls: [],
      slides: p.tipo === 'carrossel' ? 8 : null,
      status: 'rascunho',
      briefing_id: briefing.id,
    }))
    const { error: pErr } = await supabase.from('verve_posts').insert(linhas)
    if (pErr) return NextResponse.json({ briefing, error: 'rascunhos_nao_gerados: ' + pErr.message }, { status: 500 })
    rascunhos = linhas.length
  }

  return NextResponse.json({ briefing, rascunhos_gerados: rascunhos })
}
