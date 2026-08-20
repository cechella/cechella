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
const MP_TOKEN = process.env.MERCADOPAGO_TOKEN ?? 'APP_USR-1603783113978504-062408-d67a1021538897e0341f70bb7645fdcf-2669863266'
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
    const { callSid, telefone, metodo = 'pix' } = await req.json()

    if (!callSid || !telefone) {
      return NextResponse.json({ error: 'callSid e telefone obrigatórios' }, { status: 400 })
    }

    const digits = String(telefone).replace(/\D/g, '')
    const phone = digits.startsWith('55') ? digits : `55${digits}`

    // Dedup — se já gerou PIX para este callSid, reenvia o existente
    const { data: existing } = await supabase
      .from('pagamentos')
      .select('*')
      .eq('call_sid', callSid)
      .eq('metodo', metodo)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      if (metodo === 'pix') {
        const min = Math.ceil((new Date(existing.expira_em).getTime() - Date.now()) / 60000)
        await zapiSend(phone, `✅ Seu PIX ainda está ativo!\n\n⏳ Expira em ${min} minutos\n\nCopia e Cola PIX abaixo 👇`)
        await zapiSend(phone, existing.pix_code)
      }
      return NextResponse.json({ ok: true, payment_id: existing.payment_id, reused: true })
    }

    // Lê valor_pix da tabela configuracoes (permite teste com R$1)
    let valor = 5000
    try {
      const { data: cfg } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'pagamento')
        .maybeSingle()
      if (cfg?.valor?.valor_pix && Number(cfg.valor.valor_pix) > 0) {
        valor = Number(cfg.valor.valor_pix)
      }
    } catch {}

    if (metodo === 'cartao') {
      // Gera token de cartão e link de pagamento
      const token = Math.random().toString(36).slice(2) + Date.now().toString(36)
      const link = `${APP_URL}/pagar/${token}`

      const { error: cartaoInsertErr } = await supabase.from('pagamentos').insert({
        call_sid: callSid,
        lead_telefone: phone,
        payment_id: token,
        metodo: 'cartao',
        valor,
        status: 'pending',
        pix_code: null,
        expira_em: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        origem: 'gold',
        created_at: new Date().toISOString(),
      })

      if (cartaoInsertErr) {
        return NextResponse.json({ error: `DB insert error: ${cartaoInsertErr.message}` }, { status: 500 })
      }

      await zapiSend(phone, `💳 Gerando seu link de pagamento, aguarde um momento! 💜`)
      await zapiSend(phone, `Seu acesso está quase liberado! 🎉\n\nClique aqui para finalizar com segurança 👇\n${link}\n\n🔒 Ambiente 100% seguro — Mercado Pago`)

      return NextResponse.json({ ok: true, payment_id: token, metodo: 'cartao', link })
    }

    // PIX via Mercado Pago
    await zapiSend(phone, `💳 Gerando seu PIX agora, aguarde um momento! 💜`)

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `gold-pix-${callSid}-${Date.now()}`,
      },
      body: JSON.stringify({
        transaction_amount: valor,
        description: 'Programa Hormonal Dr. Vinicius',
        payment_method_id: 'pix',
        payer: { email: 'pagador@hormonioclinica.com' },
        metadata: { telefone: phone, origem: 'gold', call_sid: callSid },
      }),
    })

    if (!mpRes.ok) {
      const err = await mpRes.text()
      return NextResponse.json({ error: `Mercado Pago: ${err}` }, { status: 500 })
    }

    const mpData = await mpRes.json()
    const pixCode: string = mpData?.point_of_interaction?.transaction_data?.qr_code ?? ''
    const paymentId = String(mpData?.id ?? '')
    const expiraEm: string = mpData?.date_of_expiration ?? new Date(Date.now() + 30 * 60 * 1000).toISOString()

    if (!pixCode) {
      return NextResponse.json({ error: 'pix_code_vazio' }, { status: 500 })
    }

    const { error: insertError } = await supabase.from('pagamentos').insert({
      call_sid: callSid,
      lead_telefone: phone,
      payment_id: paymentId,
      metodo: 'pix',
      valor,
      status: 'pending',
      pix_code: pixCode,
      expira_em: expiraEm,
      origem: 'gold',
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      return NextResponse.json({ error: `DB insert error: ${insertError.message}`, payment_id: paymentId }, { status: 500 })
    }

    await zapiSend(phone, `🏦 Pagamento gerado!\n\n💰 Valor: R$ 5.000,00\n\nCopia e Cola PIX abaixo 👇`)
    await zapiSend(phone, pixCode)
    await zapiSend(phone, `Após pagar, me avise aqui! 🎯`)

    return NextResponse.json({ ok: true, payment_id: paymentId, metodo: 'pix' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
