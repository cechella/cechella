import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { publishAuthorized } from '@/lib/verve/publish-core'
import { renderPostRascunho } from '@/lib/verve/render-post'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const MAX_TENTATIVAS = 3
const tentativas = (msg: unknown): number => {
  const m = typeof msg === 'string' ? msg.match(/^render_tentativas=(\d+)/) : null
  return m ? Number(m[1]) : 0
}

// POST /api/admin/verve/render-pendentes
// Render AUTOMÁTICO: pega o carrossel em rascunho sem imagens mais antigo e gera as imagens (um por chamada, para caber nos 60 s).
// O agendador do ATLAS chama a cada poucos minutos, então o CEO nunca precisa apertar nada: depois de aprovar o briefing, o post aparece na aba
// Aprovação com as imagens. Acesso: token dedicado do agendador (VERVE_PUBLISH_TOKEN) ou administrador logado. Só imagens; autorizar continua sendo do CEO.
export async function POST(req: NextRequest) {
  if (!publishAuthorized(process.env.VERVE_PUBLISH_TOKEN, req.headers)) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
  }
  const { data: fila } = await supabase
    .from('verve_posts')
    .select('id,titulo,image_urls,error_msg,created_at')
    .eq('status', 'rascunho')
    .eq('tipo', 'carrossel')
    .order('created_at', { ascending: true })
    .limit(20)
  const semImagem = (fila ?? []).filter(p => !(Array.isArray(p.image_urls) && p.image_urls.length))
  // Cada tentativa gasta fotos pagas: no máximo 3 por post. Depois disso para e avisa (o CEO ou o Rafael investigam; nada fica em laço).
  const elegiveis = semImagem.filter(p => tentativas(p.error_msg) < MAX_TENTATIVAS)
  const esgotados = semImagem.filter(p => tentativas(p.error_msg) >= MAX_TENTATIVAS).map(p => ({ id: p.id, titulo: p.titulo }))
  const alvo = elegiveis[0]
  if (!alvo) return NextResponse.json({ pendentes: 0, ...(esgotados.length ? { esgotados } : {}) })

  const r = await renderPostRascunho(supabase, alvo.id)
  if (r.ok) await supabase.from('verve_posts').update({ error_msg: null }).eq('id', alvo.id)
  else await supabase.from('verve_posts').update({ error_msg: `render_tentativas=${tentativas(alvo.error_msg) + 1}: ${r.erro}`.slice(0, 300) }).eq('id', alvo.id).eq('status', 'rascunho')
  const restantes = elegiveis.length - 1
  return NextResponse.json({ id: alvo.id, titulo: alvo.titulo, ...(r.ok ? { ok: true, imagens: r.imagens } : { ok: false, erro: r.erro, geradas: r.geradas, esperadas: r.esperadas, tentativas: tentativas(alvo.error_msg) + 1 }), restantes, ...(esgotados.length ? { esgotados } : {}) })
}
