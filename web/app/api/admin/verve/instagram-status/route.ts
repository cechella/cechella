import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { publishAuthorized } from '@/lib/verve/publish-core'

export const dynamic = 'force-dynamic'

const IG_USER_ID = process.env.INSTAGRAM_USER_ID ?? '17841411826853302'
const IG_TOKEN   = process.env.INSTAGRAM_ACCESS_TOKEN ?? ''
const IG_BASE    = 'https://graph.facebook.com/v20.0'

async function igGet(path: string, fields: string) {
  const url = new URL(`${IG_BASE}${path}`)
  url.searchParams.set('access_token', IG_TOKEN)
  url.searchParams.set('fields', fields)
  const res = await fetch(url.toString(), { cache: 'no-store' })
  return { status: res.status, body: await res.json().catch(() => ({})) as Record<string, unknown> }
}

// GET /api/admin/verve/instagram-status
// Diz se a conexão com o Instagram LÊ (perfil) e se pode PUBLICAR (limite de publicação). Nunca devolve o token da Meta.
// Acesso: administrador logado ou o token dedicado do agendador.
export async function GET(req: NextRequest) {
  if (!publishAuthorized(process.env.VERVE_PUBLISH_TOKEN, req.headers)) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
  }
  if (!IG_TOKEN) return NextResponse.json({ configurado: false, leitura_ok: false, publicar_ok: false, erro: 'INSTAGRAM_ACCESS_TOKEN ausente' })

  const perfil = await igGet(`/${IG_USER_ID}`, 'username')
  const limite = await igGet(`/${IG_USER_ID}/content_publishing_limit`, 'quota_usage,config')
  const erro = (b: Record<string, unknown>) => (b.error && typeof b.error === 'object' ? String((b.error as Record<string, unknown>).message ?? 'erro') : undefined)
  return NextResponse.json({
    configurado: true,
    leitura_ok: perfil.status === 200 && !perfil.body.error,
    username: typeof perfil.body.username === 'string' ? perfil.body.username : null,
    publicar_ok: limite.status === 200 && !limite.body.error,
    limite: limite.body.error ? null : (limite.body.data ?? null),
    erro_leitura: erro(perfil.body),
    erro_publicar: erro(limite.body),
  })
}
