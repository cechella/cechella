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
const TUTORIAL_VIDEO_URL = 'https://pub-7091151189544b0980e12e81533a5213.r2.dev/tutorialwpp.mp4'
const APP_URL = 'https://www.hormoneecosystem.com'

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

export async function POST(req: NextRequest) {
  try {
    const { callSid, paymentId } = await req.json()
    if (!callSid && !paymentId) return NextResponse.json({ error: 'callSid ou paymentId obrigatório' }, { status: 400 })

    // Prefer paymentId directly to avoid schema cache issues with call_sid column
    let resolvedPaymentId: string | null = paymentId ?? null
    let resolvedTelefone: string | null = null

    if (!resolvedPaymentId) {
      const { data: pag } = await supabase
        .from('pagamentos')
        .select('payment_id, lead_telefone')
        .eq('call_sid', callSid)
        .eq('status', 'pending')
        .maybeSingle()
      if (!pag) {
        return NextResponse.json({ error: 'Nenhum pagamento pending encontrado para este callSid' }, { status: 404 })
      }
      resolvedPaymentId = pag.payment_id
      resolvedTelefone = pag.lead_telefone
    } else {
      const { data: pag } = await supabase
        .from('pagamentos')
        .select('lead_telefone')
        .eq('payment_id', resolvedPaymentId)
        .maybeSingle()
      resolvedTelefone = pag?.lead_telefone ?? null
    }

    if (!resolvedPaymentId) {
      return NextResponse.json({ error: 'payment_id não encontrado' }, { status: 404 })
    }

    const { data: updated, error: updateErr } = await supabase
      .from('pagamentos')
      .update({ status: 'approved' })
      .eq('payment_id', resolvedPaymentId)
      .select('payment_id, status')

    if (updateErr) {
      return NextResponse.json({ error: `DB update error: ${updateErr.message}` }, { status: 500 })
    }

    if (!updated || updated.length === 0) {
      return NextResponse.json({ error: `UPDATE afetou 0 linhas — payment_id não encontrado: ${resolvedPaymentId}` }, { status: 404 })
    }

    // Update leads status_pagamento
    const tel = String(resolvedTelefone || '').replace(/\D/g, '')
    let refDebug: Record<string, unknown> = {}
    if (tel) {
      await supabase
        .from('leads')
        .update({ status_pagamento: 'pago', updated_at: new Date().toISOString() })
        .or(`telefone.eq.${tel},telefone.eq.55${tel},telefone.eq.${tel.replace(/^55/, '')}`)

      // Generate referral token and send WhatsApp messages
      try {
        const refRes = await fetch(`${APP_URL}/api/admin/ana-master/simulador/referidos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ telefone: tel, callSid }),
        })
        const refData = await refRes.json()
        refDebug.refData = refData
        refDebug.zapiPhone = `55${tel}`.replace(/^(55)+/, '55')
        if (refData.link) {
          const r1 = await fetch(`${ZAPI_BASE}/send-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
            body: JSON.stringify({
              phone: normalize(tel),
              message: `🎉 *Pagamento confirmado!*\n\nSua jornada hormonal está começando! Em breve nossa equipe entrará em contato para agendar sua consulta. 💜`,
            }),
          })
          refDebug.zapi1Status = r1.status
          refDebug.zapi1Body = await r1.text()
          const r2 = await fetch(`${ZAPI_BASE}/send-video`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
            body: JSON.stringify({
              phone: normalize(tel),
              video: TUTORIAL_VIDEO_URL,
              caption:
                `✅ Código recebido!\n\n` +
                `1️⃣ Toque no + à esquerda\n` +
                `2️⃣ Escolha Contato\n` +
                `3️⃣ Busque e selecione suas amigas\n` +
                `4️⃣ Toque em Enviar\n\n` +
                `Você pode selecionar várias de uma vez! 💜\n\n` +
                `👉 ${refData.link}`,
            }),
          })
          refDebug.zapi2Status = r2.status
          refDebug.zapi2Body = await r2.text()
        }
      } catch (zapiErr: any) {
        refDebug.error = zapiErr.message
      }
    }

    return NextResponse.json({ ok: true, simulated: true, payment_id: resolvedPaymentId, debug: { tel, ...(typeof refDebug !== 'undefined' ? refDebug : {}) } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
