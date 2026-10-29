import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { publishAuthorized } from '@/lib/verve/publish-core'
import { versaoDoLayout } from '@/lib/verve/brand-kit'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET /api/admin/verve/post-detalhe?id=...  ou  ?q=menopausa (o carrossel mais recente cujo título contém q)  ou sem parâmetro (o mais recente)
// Leitura do que o VERVE precisa para REVISAR um post: texto de cada slide (do briefing), legenda, público, objetivo, versão do layout. Não devolve segredos nem altera nada.
// Acesso: token do agendador (VERVE_PUBLISH_TOKEN) ou administrador logado.
export async function GET(req: NextRequest) {
  if (!publishAuthorized(process.env.VERVE_PUBLISH_TOKEN, req.headers)) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
  }
  const u = new URL(req.url)
  const id = u.searchParams.get('id')?.trim()
  const q = u.searchParams.get('q')?.trim().replace(/[%,()]/g, ' ').slice(0, 60)
  let query = supabase.from('verve_posts').select('*').eq('tipo', 'carrossel')
  // sem id nem q: o carrossel mais recente (que não seja uma versão B)
  query = id ? query.eq('id', id) : (q ? query.ilike('titulo', `%${q}%`) : query).not('titulo', 'ilike', '%· versão B').order('created_at', { ascending: false }).limit(1)
  const { data } = await query
  const post = Array.isArray(data) ? data[0] : data
  if (!post) return NextResponse.json({ error: 'post_nao_encontrado' }, { status: 404 })
  let publico: string | null = null, objetivo: string | null = null
  let slides: Array<{ titulo: string; texto: string }> = []
  if (post.briefing_id) {
    const { data: b } = await supabase.from('verve_briefings').select('objetivo,publico_alvo,posts').eq('id', post.briefing_id).single()
    if (b) {
      publico = b.publico_alvo ?? null; objetivo = b.objetivo ?? null
      const plano = Array.isArray(b.posts) ? (b.posts as Array<{ tema?: string; slides?: Array<{ titulo: string; texto: string }> }>) : []
      slides = plano.find(p => p.tema === post.titulo)?.slides ?? []
    }
  }
  const imgs: string[] = Array.isArray(post.image_urls) ? post.image_urls : []
  return NextResponse.json({
    id: post.id, titulo: post.titulo, tipo: post.tipo, pilar: post.pilar, status: post.status, scheduled_at: post.scheduled_at ?? null,
    legenda: post.legenda ?? '', publico_alvo: publico, objetivo, slides, imagens: imgs.length, layout: imgs[0] ? versaoDoLayout(imgs[0]) : null,
  })
}
