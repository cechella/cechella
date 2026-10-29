import { NextRequest, NextResponse } from 'next/server'
import { cronAuthorized } from '@/lib/verve/admin-core'
import { rodarAnalise } from '@/lib/ana-aprendizado/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// Relatório semanal (Vercel Cron, segunda 08:00 de Brasília). Exige CRON_SECRET.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(process.env.CRON_SECRET, req.headers)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    return NextResponse.json({ ok: true, ...(await rodarAnalise(7)) })
  } catch (e: any) {
    console.error('[ana-aprendizado] cron', e?.message)
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
