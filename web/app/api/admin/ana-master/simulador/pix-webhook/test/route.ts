import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text'
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'
const APP_URL = 'https://www.hormoneecosystem.com'

async function zapiSend(phone: string, message: string) {
  const digits = String(phone).replace(/\D/g, '')
  const normalized = digits.startsWith('55') ? digits : `55${digits}`
  await fetch(ZAPI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
    body: JSON.stringify({ phone: normalized, message }),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  try {
    const { callSid } = await req.json()
    if (!callSid) return NextResponse.json({ error: 'callSid obrigatório' }, { status: 400 })

    const { data: pag } = await supabase
      .from('pagamentos')
      .select('payment_id, lead_telefone')
      .eq('call_sid', callSid)
      .eq('status', 'pending')
      .maybeSingle()

    if (!pag) {
      return NextResponse.json({ error: 'Nenhum pagamento pending encontrado para este callSid' }, { status: 404 })
    }

    // Mark as approved
    await supabase
      .from('pagamentos')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('call_sid', callSid)

    // Update leads status_pagamento
    const tel = String(pag.lead_telefone || '').replace(/\D/g, '')
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
        if (refData.link) {
          await zapiSend(tel,
            `🎉 *Pagamento confirmado!*\n\nSua jornada hormonal está começando! Em breve nossa equipe entrará em contato para agendar sua consulta. 💜`
          )
          await zapiSend(tel,
            `✨ *Seu link especial de indicações chegou!*\n\nIndique amigas e familiares e ganhe benefícios especiais! 🎁\n\n👉 ${refData.link}`
          )
        }
      } catch {}
    }

    return NextResponse.json({ ok: true, simulated: true, payment_id: pag.payment_id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
