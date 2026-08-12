import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST: append turn and/or save checkpoint
export async function POST(req: NextRequest) {
  try {
    const { callSid, role, text, checkpoint } = await req.json()
    if (!callSid) return NextResponse.json({ error: 'callSid obrigatório' }, { status: 400 })

    const { data: call } = await supabase
      .from('ana_calls')
      .select('memories')
      .eq('call_sid', callSid)
      .single()

    const memories = (call?.memories as Record<string, unknown>) ?? {}

    if (checkpoint) {
      const checkpoints = ((memories.checkpoints ?? {}) as Record<string, unknown>)
      checkpoints[checkpoint.gate] = {
        stage: checkpoint.stage,
        speech_progress: checkpoint.speech_progress,
        gate_log: checkpoint.gate_log,
        ts: new Date().toISOString(),
      }
      memories.checkpoints = checkpoints
    }

    if (role && text) {
      const transcript = ((memories.transcript ?? []) as unknown[])
      transcript.push({ role, text, ts: new Date().toISOString() })
      memories.transcript = transcript
    }

    await supabase
      .from('ana_calls')
      .update({ memories, updated_at: new Date().toISOString() })
      .eq('call_sid', callSid)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
