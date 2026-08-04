/**
 * VAPI Call Dispatcher — /api/admin/vapi-call
 *
 * Dispara ligação outbound via API do VAPI.
 * Usado pela página /admin/voz-test (botão "Ligar Agora").
 *
 * IMPORTANTE: o campo `serverUrl` é obrigatório no body do request.
 * Sem ele, o VAPI não envia eventos (call-start, end-of-call-report) para o webhook.
 * Resultado: lead não aparece no CRM/pipeline quando a ligação começa.
 *
 * Se o lead não aparecer ao ligar, verificar:
 * 1. `serverUrl` está presente no body do POST para api.vapi.ai/call? (esta rota)
 * 2. A rota /api/vapi/end-call está deployada e respondendo? (curl de teste)
 * 3. O VAPI Assistant → Advanced → Server URL também aponta para /api/vapi/end-call?
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VAPI_API_KEY = 'e3bc519a-7466-4450-bcfc-2ae9566d9e2f'
const ASSISTANT_ID = 'f2ab9277-dcf3-4fe5-9ac4-5cd0c45229c5'
const PHONE_NUMBER_ID = '41636d14-3f1f-4343-8d1c-f16327403690'
const DEFAULT_NUMBER = '+5548988416899'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const number = body.number || DEFAULT_NUMBER

  try {
    const res = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: ASSISTANT_ID,
        phoneNumberId: PHONE_NUMBER_ID,
        customer: { number },
        serverUrl: 'https://www.hormoneecosystem.com/api/vapi/end-call',
      }),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
