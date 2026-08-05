import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const VAPI_API_KEY = 'e3bc519a-7466-4450-bcfc-2ae9566d9e2f'
const ASSISTANT_ID = 'f2ab9277-dcf3-4fe5-9ac4-5cd0c45229c5'
const PHONE_NUMBER_ID = '63fc45bb-23bb-439a-93a4-cf680eeda22e'
const DEFAULT_NUMBER = '+5548988416899'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const number = body.number || DEFAULT_NUMBER
  const digits = String(number).replace(/\D/g, '')

  // Bloquear ligação se lead estiver com status opt_out
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
        Authorization: `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: ASSISTANT_ID,
        phoneNumberId: PHONE_NUMBER_ID,
        customer: { number },
        assistantOverrides: {
          serverUrl: 'https://www.hormoneecosystem.com/api/vapi/end-call',
        },
      }),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
