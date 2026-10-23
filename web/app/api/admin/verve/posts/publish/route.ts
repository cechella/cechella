// POST /api/admin/verve/posts/publish  { id }
// Publica UM post aprovado imediatamente — só administrador logado.
// Ignora a janela de horário (classificar): o CEO decidiu publicar agora.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { problemaDoPost } from '@/lib/verve/publish-core'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const IG_USER_ID = process.env.INSTAGRAM_USER_ID ?? ''
const IG_TOKEN   = process.env.INSTAGRAM_ACCESS_TOKEN ?? ''
const IG_BASE    = 'https://graph.facebook.com/v20.0'

async function igPost(path: string, params: Record<string, string>) {
  const url = new URL(`${IG_BASE}${path}`)
  url.searchParams.set('access_token', IG_TOKEN)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { method: 'POST' })
  return res.json()
}

async function igGet(path: string) {
  const url = new URL(`${IG_BASE}${path}`)
  url.searchParams.set('access_token', IG_TOKEN)
  const res = await fetch(url.toString())
  return res.json()
}

async function waitForContainer(containerId: string, maxAttempts = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const data = await igGet(`/${containerId}?fields=status_code`)
    if (data.status_code === 'FINISHED') return true
    if (data.status_code === 'ERROR') return false
  }
  return false
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  if (!IG_TOKEN) return NextResponse.json({ error: 'instagram_nao_configurado' }, { status: 503 })
  if (!IG_USER_ID) return NextResponse.json({ error: 'instagram_user_id_nao_configurado' }, { status: 503 })

  const body = await req.json().catch(() => ({}))
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id_obrigatorio' }, { status: 400 })

  const { data: post } = await supabase.from('verve_posts').select('*').eq('id', id).single()
  if (!post) return NextResponse.json({ error: 'post_nao_encontrado' }, { status: 404 })
  // Admin pode retentar posts em estado 'erro'; 'publicando' pode estar em progresso, bloqueado
  if (!['aprovado', 'erro'].includes(post.status)) {
    const msg = post.status === 'publicando'
      ? 'ja_esta_sendo_publicado'
      : `status_invalido: ${post.status} (esperado: aprovado)`
    return NextResponse.json({ error: msg, status_atual: post.status }, { status: 409 })
  }

  const problema = problemaDoPost(post)
  if (problema) return NextResponse.json({ error: problema }, { status: 422 })

  // Reserva atômica: evita dupla publicação
  const { data: reservado } = await supabase
    .from('verve_posts')
    .update({ status: 'publicando' })
    .eq('id', id)
    .in('status', ['aprovado', 'erro'])
    .select('id')
  if (!reservado?.length) return NextResponse.json({ error: 'ja_esta_sendo_publicado', status_atual: post.status }, { status: 409 })

  try {
    const imageUrls: string[] = Array.isArray(post.image_urls) ? post.image_urls : []
    const legenda = String(post.legenda ?? '')

    // Carrossel
    const containerIds: string[] = []
    for (const url of imageUrls) {
      const res = await igPost(`/${IG_USER_ID}/media`, { image_url: url, is_carousel_item: 'true' })
      if (!res.id) throw new Error(`Falha ao criar container: ${JSON.stringify(res)}`)
      containerIds.push(res.id)
    }
    for (const cid of containerIds) {
      const ok = await waitForContainer(cid)
      if (!ok) throw new Error(`Container ${cid} não ficou FINISHED`)
    }
    const carousel = await igPost(`/${IG_USER_ID}/media`, {
      media_type: 'CAROUSEL',
      children: containerIds.join(','),
      caption: legenda,
    })
    if (!carousel.id) throw new Error(`Falha ao criar carrossel: ${JSON.stringify(carousel)}`)

    const publish = await igPost(`/${IG_USER_ID}/media_publish`, { creation_id: carousel.id })
    if (!publish.id) throw new Error(`Meta não devolveu id: ${JSON.stringify(publish)}`)

    let permalink: string | undefined
    try {
      const info = await igGet(`/${publish.id}?fields=permalink`)
      if (typeof info.permalink === 'string') permalink = info.permalink
    } catch { /* opcional */ }

    await supabase.from('verve_posts')
      .update({ status: 'publicado', ig_media_id: publish.id, published_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ ok: true, ig_media_id: publish.id, permalink })
  } catch (err) {
    const msg = String(err).slice(0, 500)
    await supabase.from('verve_posts').update({ status: 'erro', error_msg: msg }).eq('id', id)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
