import { NextResponse } from 'next/server'

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
// Retorna: seguidores, alcance semanal, sends/reach, saves
export async function GET() {
  if (!IG_TOKEN) {
    return NextResponse.json({ error: 'INSTAGRAM_ACCESS_TOKEN não configurado' }, { status: 500 })
  }

  const [accountData, insightsData, mediaData] = await Promise.all([
    // Contagem de seguidores
    igGet(`/${IG_USER_ID}`, { fields: 'followers_count,media_count' }),
    // Insights da conta — últimos 7 dias
    igGet(`/${IG_USER_ID}/insights`, {
      metric: 'reach,impressions',
      period: 'week',
    }),
    // Últimas 10 mídias para calcular saves e sends
    igGet(`/${IG_USER_ID}/media`, {
      fields: 'id,timestamp,media_type,insights.metric(reach,saved,shares)',
      limit: '10',
    }),
  ])

  // Seguidores ganhos na semana via insights
  let followersGained = 0
  const followersInsight = await igGet(`/${IG_USER_ID}/insights`, {
    metric: 'follower_count',
    period: 'day',
    since: String(Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000)),
    until: String(Math.floor(Date.now() / 1000)),
  }).catch(() => null)

  if (followersInsight?.data?.[0]?.values) {
    const values: { value: number }[] = followersInsight.data[0].values
    followersGained = values.reduce((acc: number, v) => acc + (v.value ?? 0), 0)
  }

  // Alcance semanal
  let reach = 0
  if (insightsData?.data) {
    const reachMetric = insightsData.data.find((d: { name: string }) => d.name === 'reach')
    if (reachMetric?.values?.[0]?.value) reach = reachMetric.values[0].value
  }

  // Saves e shares das últimas mídias
  let totalSaves = 0
  let totalShares = 0
  let totalReach = 0
  if (mediaData?.data) {
    for (const media of mediaData.data) {
      const insightList: { name: string; values: { value: number }[] }[] = media.insights?.data ?? []
      for (const ins of insightList) {
        const v = ins.values?.[0]?.value ?? 0
        if (ins.name === 'saved') totalSaves += v
        if (ins.name === 'shares') totalShares += v
        if (ins.name === 'reach') totalReach += v
      }
    }
  }

  const sendsReachPct = totalReach > 0 ? ((totalShares / totalReach) * 100).toFixed(1) : '0.0'

  return NextResponse.json({
    followers_count: accountData.followers_count ?? 0,
    media_count: accountData.media_count ?? 0,
    followers_gained_week: followersGained,
    reach_week: reach,
    sends_reach_pct: sendsReachPct,
    saves_recent: totalSaves,
    updated_at: new Date().toISOString(),
  })
}
