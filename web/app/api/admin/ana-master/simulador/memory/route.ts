import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest) {
  const callSid = req.nextUrl.searchParams.get('callSid')
  const telefone = req.nextUrl.searchParams.get('telefone')

  if (!callSid) return NextResponse.json({ error: 'callSid obrigatório' }, { status: 400 })

  const { data: call } = await supabase.from('ana_calls').select('memories').eq('call_sid', callSid).single()
  const memories = (call?.memories as Record<string, unknown>) ?? {}

  let lead = null
  if (telefone) {
    const digits = String(telefone).replace(/\D/g, '')
    const { data } = await supabase
      .from('leads')
      .select('id, nome, telefone, status_pagamento, token_indicacao, etapa_agente, referido_por')
      .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)
      .maybeSingle()
    lead = data
  }

  return NextResponse.json({ memories, lead })
}

export async function POST(req: NextRequest) {
  try {
    const { callSid, key, value } = await req.json()
    if (!callSid || !key) return NextResponse.json({ error: 'callSid e key obrigatórios' }, { status: 400 })

    const { data: call } = await supabase.from('ana_calls').select('memories').eq('call_sid', callSid).single()
    const memories = { ...((call?.memories as Record<string, unknown>) ?? {}), [key]: value }

    await supabase.from('ana_calls').update({ memories, updated_at: new Date().toISOString() }).eq('call_sid', callSid)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
