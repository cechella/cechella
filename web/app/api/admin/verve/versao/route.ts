import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { publishAuthorized } from '@/lib/verve/publish-core'
import { renderPost } from '@/lib/verve/render-post'
import { podeCriarVersao, tituloDaVersao, validarPedidoVersao, SUFIXO_VERSAO } from '@/lib/verve/versao'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST /api/admin/verve/versao  { id_original, titulo?, legenda, slides:[{titulo,texto?,papel?,itens?,colunas?}], motivo? }
// REVISÃO EDITORIAL: cria a VERSÃO B ao lado do original (o original NÃO é alterado) com as fotos geradas e conferidas pelo VERVE e o layout do kit de marca.
// A versão B nasce em "aguardando": o CEO compara as duas na aba Aprovação e autoriza a que quiser. No máximo 3 versões por original por dia (cada uma gasta fotos pagas).
// Falha fechada: se as imagens não saem completas, a linha criada é apagada. Acesso: token do agendador (VERVE_PUBLISH_TOKEN) ou administrador logado.
export async function POST(req: NextRequest) {
  if (!publishAuthorized(process.env.VERVE_PUBLISH_TOKEN, req.headers)) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
  }
  const pedido = validarPedidoVersao(await req.json().catch(() => ({})))
  if (!pedido.ok) return NextResponse.json({ ok: false, erro: pedido.erro, detalhes: pedido.detalhes }, { status: pedido.erro === 'reprovado_pelo_filtro_de_publicidade_medica' ? 422 : 400 })

  const { data: orig } = await supabase.from('verve_posts').select('*').eq('id', pedido.id_original).single()
  if (!orig) return NextResponse.json({ ok: false, erro: 'original_nao_encontrado' }, { status: 404 })
  if (orig.tipo !== 'carrossel') return NextResponse.json({ ok: false, erro: 'so_carrossel' }, { status: 422 })

  const base = String(orig.titulo).replace(/ · versão B$/, '')
  // Versão B que ficou pela metade (chamada interrompida pelo limite de 60 s): sem imagens há mais de 10 min, é apagada antes de criar outra.
  const { data: velhas } = await supabase.from('verve_posts').select('id,image_urls').eq('status', 'rascunho').like('titulo', `%${SUFIXO_VERSAO}`).lt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString())
  const vazias = (velhas ?? []).filter(v => !Array.isArray(v.image_urls) || v.image_urls.length === 0).map(v => v.id)
  if (vazias.length) await supabase.from('verve_posts').delete().in('id', vazias).eq('status', 'rascunho')
  const desdeHoje = new Date(); desdeHoje.setUTCHours(0, 0, 0, 0)
  const { count } = await supabase.from('verve_posts').select('id', { count: 'exact', head: true }).like('titulo', `%${SUFIXO_VERSAO}`).ilike('titulo', `${base.slice(0, 20)}%`).gte('created_at', desdeHoje.toISOString())
  if (!podeCriarVersao(count ?? 0)) return NextResponse.json({ ok: false, erro: 'limite_diario_de_versoes' }, { status: 429 })

  const { data: nova, error } = await supabase.from('verve_posts').insert({
    tipo: 'carrossel', titulo: tituloDaVersao(String(orig.titulo), pedido.titulo), legenda: pedido.legenda, pilar: orig.pilar, scheduled_at: orig.scheduled_at,
    image_urls: [], slides: pedido.slides.length, status: 'rascunho', briefing_id: orig.briefing_id,
  }).select().single()
  if (error || !nova) return NextResponse.json({ ok: false, erro: 'versao_nao_criada: ' + (error?.message ?? 'sem_linha') }, { status: 500 })

  const r = await renderPost(supabase, nova.id, { slidesDetalhe: pedido.slides })
  if (!r.ok) {
    await supabase.from('verve_posts').delete().eq('id', nova.id).eq('status', 'rascunho')   // falha fechada: nada de versão pela metade
    return NextResponse.json({ ok: false, erro: r.erro, qa: r.qa }, { status: r.status })
  }
  return NextResponse.json({ ok: true, id: nova.id, id_original: orig.id, titulo: nova.titulo, imagens: r.imagens, qa: r.qa, geracoes: r.geracoes, status: 'aguardando' })
}
