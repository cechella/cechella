import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const VAPI_KEY = process.env.VAPI_API_KEY!
const REALTIME_ASSISTANT_ID = process.env.VAPI_REALTIME_ASSISTANT_ID || 'f6460055-a69b-49c8-ae0b-4edc9dca9668'
const PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID || '41636d14-3f1f-4343-8d1c-f16327403690'
const SERVER_URL = 'https://www.hormoneecosystem.com/api/vapi/end-call'
const DEFAULT_NUMBER = '+5548988416899'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const number = body.number || DEFAULT_NUMBER
  const digits = String(number).replace(/\D/g, '')

  const { data: lead } = await supabase
    .from('leads')
    .select('status')
    .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)
    .limit(1)
    .maybeSingle()

  if (lead?.status === 'opt_out') {
    return NextResponse.json({ error: 'Lead bloqueado (opt_out)' }, { status: 403 })
  }

  try {
    const res = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VAPI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: REALTIME_ASSISTANT_ID,
        phoneNumberId: PHONE_NUMBER_ID,
        customer: { number },
        assistantOverrides: {
          serverUrl: SERVER_URL,
          backgroundSound: 'off',
          startSpeakingPlan: {
            waitSeconds: 0.4,
            transcriptionEndpointingPlan: {
              onPunctuationSeconds: 0.2,
              onNoPunctuationSeconds: 1.5,
              onNumberSeconds: 0.5,
            },
          },
          stopSpeakingPlan: {
            numWords: 2,
            voiceSeconds: 0.2,
            backoffSeconds: 1.0,
          },
          silenceTimeoutSeconds: 45,
          maxDurationSeconds: 1800,
        },
      }),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
