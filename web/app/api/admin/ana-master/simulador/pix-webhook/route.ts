import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function handlePaymentConfirmed(callSid: string, paymentId: string) {
  // Fetch pagamento by payment_id (avoids schema cache issue with call_sid column)
  const { data: pag } = await supabase
    .from('pagamentos')
    .select('lead_telefone, valor')
    .eq('payment_id', paymentId)
    .maybeSingle()

  const tel = String(pag?.lead_telefone || '').replace(/\D/g, '')
  if (tel) {
    // Update leads BEFORE pagamentos so Realtime subscribers find status_pagamento='pago' immediately
    await supabase
      .from('leads')
      .update({ status_pagamento: 'pago', updated_at: new Date().toISOString() })
      .or(`telefone.eq.${tel},telefone.eq.55${tel},telefone.eq.${tel.replace(/^55/, '')}`)
  }

  await supabase
    .from('pagamentos')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('payment_id', paymentId)

}

// Mercado Pago production webhook
export async function POST(req: NextRequest) {
  try {
    // Real Mercado Pago webhook
    const body = await req.json()
    const type = body?.type || body?.action
    const dataId = body?.data?.id || body?.id

    if ((type === 'payment' || type === 'payment.updated') && dataId) {
      // Fetch payment details from MP
      const MP_TOKEN = process.env.MERCADOPAGO_TOKEN ?? 'APP_USR-1603783113978504-062408-d67a1021538897e0341f70bb7645fdcf-2669863266'
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
        headers: { 'Authorization': `Bearer ${MP_TOKEN}` },
      })
      if (!mpRes.ok) return NextResponse.json({ ok: false })

      const mpData = await mpRes.json()
      if (mpData.status !== 'approved') return NextResponse.json({ ok: true, status: mpData.status })

      const callSid = mpData?.metadata?.call_sid
      if (!callSid) return NextResponse.json({ ok: true, note: 'no call_sid in metadata' })

      await handlePaymentConfirmed(callSid, String(dataId))
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
