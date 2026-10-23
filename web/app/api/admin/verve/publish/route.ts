import { NextRequest, NextResponse } from 'next/server'
import { cronAuthorized } from '@/lib/verve/admin-core'
import { publishAuthorized, classificar, problemaDoPost, ANTECEDENCIA_MS, MAX_POR_EXECUCAO } from '@/lib/verve/publish-core'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const IG_USER_ID = process.env.INSTAGRAM_USER_ID ?? '17841411826853302'
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

async function publishPost(post: Record<string, unknown>) {
  const imageUrls: string[] = Array.isArray(post.image_urls) ? post.image_urls as string[] : []
  const legenda = String(post.legenda ?? '')
  const tipo = String(post.tipo)

  if (tipo === 'carrossel' && imageUrls.length > 1) {
    // 1. Cria container para cada slide
    const containerIds: string[] = []
    for (const url of imageUrls) {
      const res = await igPost(`/${IG_USER_ID}/media`, {
        image_url: url,
        is_carousel_item: 'true',
      })
      if (!res.id) throw new Error(`Falha ao criar container slide: ${JSON.stringify(res)}`)
      containerIds.push(res.id)
    }

    // 2. Aguarda todos ficarem FINISHED
    for (const cid of containerIds) {
      const ok = await waitForContainer(cid)
      if (!ok) throw new Error(`Container ${cid} não ficou FINISHED`)
    }

    // 3. Cria carrossel pai
    const carousel = await igPost(`/${IG_USER_ID}/media`, {
      media_type: 'CAROUSEL',
      children: containerIds.join(','),
      caption: legenda,
    })
    if (!carousel.id) throw new Error(`Falha ao criar carrossel: ${JSON.stringify(carousel)}`)

    // 4. Publica
    const publish = await igPost(`/${IG_USER_ID}/media_publish`, {
      creation_id: carousel.id,
    })
    return publish

  } else if (tipo === 'reel' && imageUrls[0]) {
    // Reel: usa video_url
    const container = await igPost(`/${IG_USER_ID}/media`, {
      media_type: 'REELS',
      video_url: imageUrls[0],
      caption: legenda,
    })
    if (!container.id) throw new Error(`Falha ao criar reel: ${JSON.stringify(container)}`)
    const ok = await waitForContainer(container.id, 20)
    if (!ok) throw new Error(`Container reel ${container.id} não ficou FINISHED`)
    return igPost(`/${IG_USER_ID}/media_publish`, { creation_id: container.id })

  } else if (imageUrls[0]) {
    // Imagem simples
    const container = await igPost(`/${IG_USER_ID}/media`, {
      image_url: imageUrls[0],
      caption: legenda,
    })
    if (!container.id) throw new Error(`Falha ao criar imagem: ${JSON.stringify(container)}`)
    const ok = await waitForContainer(container.id)
    if (!ok) throw new Error(`Container imagem ${container.id} não ficou FINISHED`)
    return igPost(`/${IG_USER_ID}/media_publish`, { creation_id: container.id })
  }

  throw new Error('Nenhuma image_url fornecida para publicação')
}

async function handlePublish(req: NextRequest): Promise<NextResponse> {
  if (!cronAuthorized(process.env.CRON_SECRET, req.headers) && !publishAuthorized(process.env.VERVE_PUBLISH_TOKEN, req.headers)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  // Sem token da Meta não reserva nem marca nada: evita deixar post em "publicando" por falta de configuração.
  if (!IG_TOKEN) return NextResponse.json({ error: 'instagram_nao_configurado' }, { status: 503 })

  const agora = new Date()
  const limite = new Date(agora.getTime() + ANTECEDENCIA_MS)

  const { data: posts, error } = await supabase
    .from('verve_posts')
    .select('*')
    .eq('status', 'aprovado')
    .lte('scheduled_at', limite.toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(MAX_POR_EXECUCAO)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Posts que ficaram "publicando": não se tenta de novo sozinho (pode já ter ido ao Instagram); só se informa para conferência humana.
  const { data: presos } = await supabase.from('verve_posts').select('id,titulo').eq('status', 'publicando').limit(20)

  const results: { id: string; titulo?: string; ok: boolean; igId?: string; permalink?: string; error?: string }[] = []

  for (const post of posts ?? []) {
    const janela = classificar(post.scheduled_at, agora)
    if (janela === 'cedo') continue
    if (janela === 'atrasado' || janela === 'invalido') {
      const msg = janela === 'atrasado' ? 'atrasado: passou mais de 6 h do horário marcado; reagende e autorize de novo' : 'horario_invalido'
      await supabase.from('verve_posts').update({ status: 'erro', error_msg: msg }).eq('id', post.id).eq('status', 'aprovado')
      results.push({ id: post.id, titulo: post.titulo, ok: false, error: msg })
      continue
    }
    const problema = problemaDoPost(post)
    if (problema) {
      await supabase.from('verve_posts').update({ status: 'erro', error_msg: problema }).eq('id', post.id).eq('status', 'aprovado')
      results.push({ id: post.id, titulo: post.titulo, ok: false, error: problema })
      continue
    }

    // Reserva ATÔMICA: só quem conseguir mudar 'aprovado' -> 'publicando' publica. Duas execuções sobrepostas nunca publicam o mesmo post.
    const { data: reservado } = await supabase
      .from('verve_posts')
      .update({ status: 'publicando' })
      .eq('id', post.id)
      .eq('status', 'aprovado')
      .select('id')
    if (!reservado?.length) continue

    try {
      const result = await publishPost(post)
      if (!result?.id) throw new Error(`Meta não devolveu o identificador da publicação: ${JSON.stringify(result)}`)
      let permalink: string | undefined
      try {
        const info = await igGet(`/${result.id}?fields=permalink`)
        if (typeof info.permalink === 'string') permalink = info.permalink
      } catch { /* o link é opcional */ }
      const { error: updErr } = await supabase
        .from('verve_posts')
        .update({ status: 'publicado', ig_media_id: result.id, published_at: new Date().toISOString() })
        .eq('id', post.id)
      results.push({ id: post.id, titulo: post.titulo, ok: true, igId: result.id, permalink, ...(updErr ? { error: 'publicado_no_instagram_mas_nao_gravado: ' + updErr.message } : {}) })
    } catch (err) {
      const msg = String(err).slice(0, 500)
      await supabase.from('verve_posts').update({ status: 'erro', error_msg: msg }).eq('id', post.id)
      results.push({ id: post.id, titulo: post.titulo, ok: false, error: msg })
    }
  }

  return NextResponse.json({
    published: results.filter(r => r.ok).length,
    results,
    ...(presos?.length ? { presos } : {}),
  })
}

export async function GET(req: NextRequest) { return handlePublish(req) }
export async function POST(req: NextRequest) { return handlePublish(req) }
