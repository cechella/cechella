import { NextRequest, NextResponse } from 'next/server'
import { contexto } from '../_ctx'
import { reconciliar } from '@/lib/ebook/service'
import { cronAuthorized } from '@/lib/verve/admin-core'

export const dynamic = 'force-dynamic'

// Reconciliação periódica (cron com CRON_SECRET): consulta no provedor os pedidos ainda pendentes, cobrindo webhook perdido.
export async function GET(req: NextRequest) {
  if (!cronAuthorized(process.env.CRON_SECRET, req.headers)) return NextResponse.json({ erro: 'nao_autorizado' }, { status: 401 })
  try { return NextResponse.json({ ok: true, ...(await reconciliar(contexto())) }) } catch { return NextResponse.json({ erro: 'falha_temporaria' }, { status: 500 }) }
}
