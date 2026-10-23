import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { atlasAuthorized } from '@/lib/verve/admin-core'
import { publishAuthorized } from '@/lib/verve/publish-core'
import { METRICAS_CONTA, METRICAS_MIDIA, diagnostico, resumirMidia, valorMetrica, type Metrica, type MidiaBruta } from '@/lib/verve/insights'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const IG_USER_ID = process.env.INSTAGRAM_USER_ID ?? '17841411826853302'
const IG_TOKEN   = process.env.INSTAGRAM_ACCESS_TOKEN ?? ''
const IG_BASE    = 'https://graph.facebook.com/v20.0'

async function ig(path: string, params: Record<string, string> = {}): Promise<unknown> {
  const url = new URL(`${IG_BASE}${path}`)
  url.searchParams.set('access_token', IG_TOKEN)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  try {
    const res = await fetch(url.toString(), { cache: 'no-store' })
    return await res.json()
  } catch {
    return { error: { message: 'falha_de_rede' } }
  }
}

// GET /api/admin/verve/insights?limit=25
// Desempenho do Instagram (conta + últimas mídias) para o ATLAS. SOMENTE LEITURA; o token da Meta nunca sai daqui.
// Número desconhecido = null + motivo (nunca zero). Acesso: token do ATLAS, token do agendador ou administrador logado.
export async function GET(req: NextRequest) {
  if (!atlasAuthorized(process.env.VERVE_ATLAS_TOKEN, req.headers) && !publishAuthorized(process.env.VERVE_PUBLISH_TOKEN, req.headers)) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
  }
  if (!IG_TOKEN) return NextResponse.json({ error: 'instagram_nao_configurado' }, { status: 503 })

  const limit = Math.max(1, Math.min(Number(new URL(req.url).searchParams.get('limit') ?? 25) || 25, 40))
  const agora = Math.floor(Date.now() / 1000)

  const perfil = (await ig(`/${IG_USER_ID}`, { fields: 'username,followers_count,follows_count,media_count' })) as Record<string, unknown>
  const perfilOk = !perfil.error && typeof perfil.followers_count === 'number'

  // Insights da conta, um por vez (uma recusada não derruba as outras). Janela: últimas 24 h e últimos 7 dias.
  const conta: Record<string, { dia: Metrica; semana: Metrica }> = {}
  for (const m of METRICAS_CONTA) {
    const [dia, semana] = await Promise.all([
      ig(`/${IG_USER_ID}/insights`, { metric: m, period: 'day', metric_type: 'total_value', since: String(agora - 86400), until: String(agora) }),
      ig(`/${IG_USER_ID}/insights`, { metric: m, period: 'day', metric_type: 'total_value', since: String(agora - 7 * 86400), until: String(agora) }),
    ])
    conta[m] = { dia: valorMetrica(dia), semana: valorMetrica(semana) }
  }

  const lista = (await ig(`/${IG_USER_ID}/media`, { fields: 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count', limit: String(limit) })) as { data?: MidiaBruta[]; error?: unknown }
  const midias = Array.isArray(lista.data) ? lista.data : []

  // Posts do sistema ligados às mídias (título, pilar), para o ATLAS associar objetivo e experimento.
  const ids = midias.map(m => m.id).filter((x): x is string => !!x)
  const { data: posts } = ids.length ? await supabase.from('verve_posts').select('id,titulo,pilar,tipo,ig_media_id').in('ig_media_id', ids) : { data: [] }
  const porMidia = new Map((posts ?? []).map(p => [p.ig_media_id as string, p]))

  const todas: Metrica[] = Object.values(conta).flatMap(c => [c.dia, c.semana])
  const resumo = []
  for (let i = 0; i < midias.length; i += 5) {   // 5 mídias por vez: respeita o limite de chamadas da Meta
    const lote = midias.slice(i, i + 5)
    const feito = await Promise.all(lote.map(async m => {
      const entradas = await Promise.all(METRICAS_MIDIA.map(async k => [k, valorMetrica(await ig(`/${m.id}/insights`, { metric: k }))] as const))
      const metricas = Object.fromEntries(entradas) as Record<string, Metrica>
      todas.push(...Object.values(metricas))
      const p = m.id ? porMidia.get(m.id) : undefined
      return resumirMidia(m, metricas, p ? { id: p.id as string, titulo: p.titulo as string, pilar: p.pilar as string, tipo: p.tipo as string } : null)
    }))
    resumo.push(...feito)
  }

  // Decisões do CEO (aprendizado): posts recentes aprovados/recusados/publicados.
  const { data: decisoes } = await supabase.from('verve_posts').select('id,titulo,tipo,pilar,status,scheduled_at').in('status', ['recusado', 'aprovado', 'publicado']).order('scheduled_at', { ascending: false }).limit(40)

  return NextResponse.json({
    coletado_em: new Date().toISOString(),
    fonte: 'instagram_graph_api',
    conta: perfilOk ? { username: perfil.username ?? null, seguidores: perfil.followers_count, seguindo: perfil.follows_count ?? null, midias: perfil.media_count ?? null } : { erro: (perfil.error as Record<string, unknown> | undefined)?.message ?? 'perfil_indisponivel' },
    conta_insights: conta,
    midias: resumo,
    decisoes: decisoes ?? [],
    diagnostico: diagnostico(perfilOk, todas),
  })
}
