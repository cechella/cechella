import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GOLDEN_PROMPT, ANA_BASE_PROMPT } from '@/lib/ana-master/constants'
import { ANA_PROFILE_GOLD, ACTIVE_PROFILE } from '@/lib/ana-master/runtime-profile'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// SQL to create table (run once in Supabase SQL editor):
// create table if not exists ana_realtime_profiles (
//   profile text primary key,
//   model text not null default 'gpt-realtime-2.1',
//   voice text not null default 'marin',
//   vad_type text not null default 'server_vad',
//   vad_threshold float default 0.5,
//   vad_prefix_padding_ms int default 300,
//   vad_silence_duration_ms int default 500,
//   vad_eagerness text default 'low',
//   transcription_model text default 'gpt-realtime-whisper',
//   noise_reduction text default 'far_field',
//   max_output_tokens text default 'inf',
//   reasoning_effort text default 'low',
//   instructions text,
//   updated_at timestamptz default now()
// );

export const GOLD_DEFAULTS = {
  profile: 'gold',
  model: ANA_PROFILE_GOLD.model,
  voice: ANA_PROFILE_GOLD.voice,
  vad_type: 'server_vad',
  vad_threshold: 0.5,
  vad_prefix_padding_ms: 300,
  vad_silence_duration_ms: 500,
  vad_eagerness: 'low',
  transcription_model: ANA_PROFILE_GOLD.transcription_model,
  noise_reduction: ANA_PROFILE_GOLD.noise_reduction ?? 'far_field',
  max_output_tokens: 'inf',
  reasoning_effort: 'low',
  instructions: GOLDEN_PROMPT,
}

export const CONTROLLER_DEFAULTS = {
  profile: 'controller',
  model: ACTIVE_PROFILE.model,
  voice: ACTIVE_PROFILE.voice,
  vad_type: ACTIVE_PROFILE.vad.type,
  vad_threshold: (ACTIVE_PROFILE.vad as any).threshold ?? 0.5,
  vad_prefix_padding_ms: (ACTIVE_PROFILE.vad as any).prefix_padding_ms ?? 300,
  vad_silence_duration_ms: (ACTIVE_PROFILE.vad as any).silence_duration_ms ?? 500,
  vad_eagerness: (ACTIVE_PROFILE.vad as any).eagerness ?? 'low',
  transcription_model: ACTIVE_PROFILE.transcription_model,
  noise_reduction: ACTIVE_PROFILE.noise_reduction ?? 'far_field',
  max_output_tokens: 'inf',
  reasoning_effort: 'low',
  instructions: ANA_BASE_PROMPT,
}

export async function GET(req: NextRequest) {
  const profile = req.nextUrl.searchParams.get('profile') ?? 'gold'
  const defaults = profile === 'gold' ? GOLD_DEFAULTS : CONTROLLER_DEFAULTS

  try {
    const { data, error } = await supabase
      .from('ana_realtime_profiles')
      .select('*')
      .eq('profile', profile)
      .single()

    if (error || !data) {
      return NextResponse.json({ ...defaults, _source: 'defaults' })
    }

    return NextResponse.json({ ...data, _source: 'db' })
  } catch {
    return NextResponse.json({ ...defaults, _source: 'defaults' })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { profile } = body

    if (!profile || !['gold', 'controller'].includes(profile)) {
      return NextResponse.json({ error: 'profile inválido' }, { status: 400 })
    }

    const record = {
      ...body,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('ana_realtime_profiles')
      .upsert(record, { onConflict: 'profile' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
