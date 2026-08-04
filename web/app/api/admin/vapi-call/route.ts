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
