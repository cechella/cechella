import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET: return transcript + callSid of the most recent active session (last 30 min)
export async function GET(req: NextRequest) {
  try {
    const callSid = req.nextUrl.searchParams.get('callSid')
    let query = supabase
      .from('ana_calls')
      .select('call_sid, memories, stage, updated_at')
      .eq('status', 'active')
      .like('call_sid', 'sim-browser-%')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (callSid) {
      query = supabase
        .from('ana_calls')
        .select('call_sid, memories, stage, updated_at')
        .eq('call_sid', callSid)
        .limit(1)
    }

    const { data } = await query
    const row = data?.[0]
    if (!row) return NextResponse.json({ found: false })

    const ageMs = Date.now() - new Date(row.updated_at).getTime()
    if (!callSid && ageMs > 30 * 60 * 1000) return NextResponse.json({ found: false })

    const memories = (row.memories as Record<string, unknown>) ?? {}
    return NextResponse.json({
      found: true,
      callSid: row.call_sid,
      stage: row.stage,
      transcript: memories.transcript ?? [],
      checkpoints: memories.checkpoints ?? {},
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: append turn, save checkpoint, and/or persist sub-gate SpeechProgress
export async function POST(req: NextRequest) {
  try {
    const { callSid, role, text, checkpoint, speech_state } = await req.json()
    if (!callSid) return NextResponse.json({ error: 'callSid obrigatório' }, { status: 400 })

    const { data: call } = await supabase
      .from('ana_calls')
      .select('memories')
      .eq('call_sid', callSid)
      .single()

    const memories = (call?.memories as Record<string, unknown>) ?? {}

    // Gate checkpoint (after each gate)
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

    // Sub-gate SpeechProgress event (FASE 2B — recovery between gates)
    if (speech_state) {
      const log = ((memories.speech_state_log ?? []) as unknown[])
      log.push({ ...speech_state, ts: new Date().toISOString() })
      // Keep only last 100 events to avoid unbounded growth
      memories.speech_state_log = log.slice(-100)
      // Also overwrite the current speech_progress for fast restore
      if (speech_state.speech_progress) {
        memories.speech_progress = speech_state.speech_progress
      }
    }

    // Transcript turn
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
