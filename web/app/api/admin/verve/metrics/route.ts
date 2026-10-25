import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { valorMetrica } from '@/lib/verve/insights'
import { montarMetricas } from '@/lib/verve/metricas-painel'

const IG_USER_ID = process.env.INSTAGRAM_USER_ID ?? '17841411826853302'
const IG_TOKEN   = process.env.INSTAGRAM_ACCESS_TOKEN ?? ''
const IG_BASE    = 'https://graph.facebook.com/v20.0'

async function igGet(path: string, params: Record<string, string> = {}) {
  const url = new URL(`${IG_BASE}${path}`)
  url.searchParams.set('access_token', IG_TOKEN)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), { next: { revalidate: 300 } })
  return res.json()
}

// GET /api/admin/verve/metrics
// Números da aba Métricas. Dado desconhecido é null + motivo (nunca zero): a Meta recusa métricas por permissão, por período ou por mídia, e isso não é "desempenho zero".
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response
  if (!IG_TOKEN) {
    return NextResponse.json({ error: 'INSTAGRAM_ACCESS_TOKEN não configurado' }, { status: 500 })
  }
  const agora = Math.floor(Date.now() / 1000)
  const perfil = (await igGet(`/${IG_USER_ID}`, { fields: 'followers_count' })) as Record<string, unknown>
  const seguidores = !perfil.error && typeof perfil.followers_count === 'number' ? perfil.followers_count : null
  const conta = (metric: string) => igGet(`/${IG_USER_ID}/insights`, { metric, period: 'day', metric_type: 'total_value', since: String(agora - 7 * 86400), until: String(agora) }).then(valorMetrica)
  const [alcance7d, ganhos7d] = await Promise.all([conta('reach'), conta('follower_count')])
  const lista = (await igGet(`/${IG_USER_ID}/media`, { fields: 'id', limit: '10' })) as { data?: Array<{ id?: string }> }
  const ids = (Array.isArray(lista.data) ? lista.data : []).map(m => m.id).filter((x): x is string => !!x)
  const midias = await Promise.all(ids.map(async id => {
    const [saved, shares, reach] = await Promise.all(['saved', 'shares', 'reach'].map(k => igGet(`/${id}/insights`, { metric: k }).then(valorMetrica)))
    return { saved, shares, reach }
  }))
  return NextResponse.json(montarMetricas({ seguidores, ganhos7d, alcance7d, midias }))
}
