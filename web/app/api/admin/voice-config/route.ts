import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const supabase = makeClient()
  const { data, error } = await supabase
    .from('ana_voice_config')
    .select('*')
    .eq('profile', 'gold')
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const defaults = {
    profile: 'gold',
    voice: 'bossa',
    model: 'gpt-realtime-2.1',
    vad_mode: 'normal',
    vad_threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500,
    noise_reduction: 'far_field',
    reasoning_effort: 'low',
    user_transcript_model: 'gpt-4o-transcribe',
  }

  return NextResponse.json({ data: data ?? defaults })
}

export async function POST(req: NextRequest) {
  const supabase = makeClient()
  const body = await req.json()

  const config = {
    profile: 'gold',
    voice: body.voice,
    model: body.model,
    vad_mode: body.vad_mode ?? 'normal',
    vad_threshold: body.vad_threshold ?? 0.5,
    prefix_padding_ms: body.prefix_padding_ms ?? 300,
    silence_duration_ms: body.silence_duration_ms ?? 500,
    noise_reduction: body.noise_reduction ?? 'far_field',
    reasoning_effort: body.reasoning_effort ?? 'low',
    user_transcript_model: body.user_transcript_model ?? 'gpt-4o-transcribe',
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('ana_voice_config')
    .upsert(config, { onConflict: 'profile' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, ok: true })
}
