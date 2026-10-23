import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { renderCarrossel } from '@/lib/verve/render-slide'
import { detectPersona } from '@/lib/verve/persona'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST /api/admin/verve/posts/render  { id }
// Gera (ou refaz) as imagens de UM carrossel que está como rascunho, a partir do briefing guardado (slides do Gustavo, se houver).
// Só administrador logado. Só mexe em imagens: o post vai para "aguardando" e a autorização continua sendo do CEO.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response
  const body = await req.json().catch(() => ({}))
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id_obrigatorio' }, { status: 400 })

  const { data: post } = await supabase.from('verve_posts').select('*').eq('id', id).single()
  if (!post) return NextResponse.json({ error: 'post_nao_encontrado' }, { status: 404 })
  if (post.status !== 'rascunho') return NextResponse.json({ error: 'so_refaz_rascunho' }, { status: 409 })
  if (post.tipo !== 'carrossel') return NextResponse.json({ error: 'so_carrossel' }, { status: 422 })

  let publico: string | undefined, objetivo: string | undefined, titulo = String(post.titulo)
  let slides: { titulo: string; texto: string }[] = []
  if (post.briefing_id) {
    const { data: b } = await supabase.from('verve_briefings').select('titulo,objetivo,publico_alvo,posts').eq('id', post.briefing_id).single()
    if (b) {
      publico = b.publico_alvo; objetivo = b.objetivo
      const plano = Array.isArray(b.posts) ? (b.posts as Array<{ tema?: string; slides?: { titulo: string; texto: string }[] }>) : []
      slides = plano.find(p => p.tema === post.titulo)?.slides ?? []
      titulo = post.titulo
    }
  }
  const persona = detectPersona(publico, post.titulo, objetivo)
  const total = slides.length || post.slides || 8

  const urls = await renderCarrossel({
    titulo,
    temas: slides.map(s => s.titulo),
    descricoes: slides.map(s => s.texto),
    pilar: post.pilar,
    slides: total,
    persona,
    postId: post.id,
  })
  // Falha fechada: carrossel incompleto não vai para aprovação.
  if (urls.length !== Math.max(2, Math.min(total, 10))) {
    return NextResponse.json({ ok: false, error: 'geracao_incompleta', geradas: urls.length, esperadas: total }, { status: 502 })
  }
  const { error } = await supabase.from('verve_posts').update({ image_urls: urls, status: 'aguardando' }).eq('id', post.id).eq('status', 'rascunho')
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, imagens: urls.length, persona, slides_do_gustavo: slides.length > 0 })
}
