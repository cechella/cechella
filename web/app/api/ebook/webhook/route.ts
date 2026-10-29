import { NextRequest, NextResponse } from 'next/server'
import { contexto } from '../_ctx'
import { processarWebhook } from '@/lib/ebook/service'
import { assinaturaValida } from '@/lib/ebook/core'

export const dynamic = 'force-dynamic'

// Webhook do Mercado Pago só do e-book. O aviso nunca aprova nada: o pagamento é consultado no provedor e conferido (valor, moeda, referência, recebedor) antes de qualquer liberação.
export async function POST(req: NextRequest) {
  const q = req.nextUrl.searchParams
  const corpo = await req.json().catch(() => ({} as Record<string, unknown>))
  const dataId = String((corpo as { data?: { id?: unknown } }).data?.id ?? q.get('data.id') ?? q.get('id') ?? '')
  if (!dataId) return NextResponse.json({ ok: true, ignorado: 'sem_id' })
  const segredo = process.env.MP_WEBHOOK_SECRET
  if (segredo && !assinaturaValida({ segredo, xSignature: req.headers.get('x-signature'), xRequestId: req.headers.get('x-request-id'), dataId })) {
    return NextResponse.json({ erro: 'assinatura_invalida' }, { status: 401 })
  }
  try {
    const r = await processarWebhook(contexto(), dataId)
    return NextResponse.json({ ok: true, aplicado: r.aplicado, motivo: r.motivo ?? null })
  } catch {
    return NextResponse.json({ erro: 'falha_temporaria' }, { status: 500 })   // o provedor tenta de novo; a reconciliação também cobre
  }
}
