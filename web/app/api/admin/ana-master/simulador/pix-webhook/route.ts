import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ZAPI_BASE = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5'
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'
const APP_URL = 'https://www.hormoneecosystem.com'
const TUTORIAL_VIDEO_URL = 'https://pub-7091151189544b0980e12e81533a5213.r2.dev/tutorialwpp.mp4'

function normalize(phone: string) {
  const d = String(phone).replace(/\D/g, '')
  return d.startsWith('55') ? d : `55${d}`
}

async function zapiSend(phone: string, message: string) {
  await fetch(`${ZAPI_BASE}/send-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
    body: JSON.stringify({ phone: normalize(phone), message }),
  }).catch(() => {})
}

async function zapiSendVideo(phone: string, video: string, caption: string) {
  await fetch(`${ZAPI_BASE}/send-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
    body: JSON.stringify({ phone: normalize(phone), video, caption }),
  }).catch(() => {})
}

async function handlePaymentConfirmed(callSid: string, paymentId: string) {
  // Fetch pagamento by payment_id (avoids schema cache issue with call_sid column)
  const { data: pag } = await supabase
    .from('pagamentos')
    .select('lead_telefone, valor')
    .eq('payment_id', paymentId)
    .maybeSingle()

  await supabase
    .from('pagamentos')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('payment_id', paymentId)

  const tel = String(pag?.lead_telefone || '').replace(/\D/g, '')
  if (tel) {
    await supabase
      .from('leads')
      .update({ status_pagamento: 'pago', updated_at: new Date().toISOString() })
      .or(`telefone.eq.${tel},telefone.eq.55${tel},telefone.eq.${tel.replace(/^55/, '')}`)

    // Generate referral token and send via WhatsApp
    try {
      const refRes = await fetch(`${APP_URL}/api/admin/ana-master/simulador/referidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone: tel, callSid }),
      })
      const refData = await refRes.json()
      if (refData.link) {
        await zapiSend(tel,
          `🎉 *Pagamento confirmado!*\n\nSua jornada hormonal está começando! Em breve nossa equipe entrará em contato para agendar sua consulta. 💜`
        )
        await zapiSendVideo(tel, TUTORIAL_VIDEO_URL,
          `✅ Código recebido!\n\n` +
          `1️⃣ Toque no + à esquerda\n` +
          `2️⃣ Escolha Contato\n` +
          `3️⃣ Busque e selecione suas amigas\n` +
          `4️⃣ Toque em Enviar\n\n` +
          `Você pode selecionar várias de uma vez! 💜\n\n` +
          `👉 ${refData.link}`
        )
      }
    } catch {}
  }
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
