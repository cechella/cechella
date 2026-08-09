import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { VAPI_CONFIG } from '@/lib/vapi-config'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

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

  // Fase de validação: params V2 aplicados em 100% das ligações
  const voiceOverrides = {
    responseDelaySeconds: 0.4,
    backgroundSound: 'off',
    stopSpeakingPlan: {
      numWords: 4,
    },
  }

  try {
    const res = await fetch('https://api.vapi.ai/call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VAPI_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: VAPI_CONFIG.assistantId,
        phoneNumberId: VAPI_CONFIG.phoneNumberId,
        customer: { number },
        assistantOverrides: {
          serverUrl: VAPI_CONFIG.serverUrl,
          ...voiceOverrides,
        },
      }),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
