import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MP_TOKEN = 'APP_USR-1603783113978504-062408-d67a1021538897e0341f70bb7645fdcf-2669863266'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { telefone, valor, callId } = body

  if (!telefone || !valor) {
    return NextResponse.json({ error: 'telefone e valor obrigatórios' }, { status: 400 })
  }

  const idempotencyKey = `voz-pix-${telefone}-${Date.now()}`

  try {
    const res = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        transaction_amount: valor,
        description: 'Programa Hormonal Dr. Vinicius',
        payment_method_id: 'pix',
        payer: {
          email: 'pagador@hormonioclinica.com',
          identification: { type: 'CPF', number: '19119119100' },
        },
        metadata: { telefone, origem: 'voz', call_id: callId || '' },
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data })
    }

    const pixCode = data?.point_of_interaction?.transaction_data?.qr_code || ''
    const paymentId = data?.id || ''

    return NextResponse.json({ pixCode, paymentId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
}
