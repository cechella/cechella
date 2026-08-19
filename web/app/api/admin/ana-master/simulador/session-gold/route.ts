import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GOLD_DEFAULTS } from '@/app/api/admin/ana-master/realtime-config/route'
import { ANA_PROFILE_GOLD } from '@/lib/ana-master/runtime-profile'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function getGoldConfig() {
  try {
    const { data } = await supabase
      .from('ana_realtime_profiles')
      .select('*')
      .eq('profile', 'gold')
      .single()
    return data ?? GOLD_DEFAULTS
  } catch {
    return GOLD_DEFAULTS
  }
}

export async function POST(req: NextRequest) {
  try {
    const { telefone, voice, model } = await req.json()

    if (!telefone) {
      return NextResponse.json({ error: 'telefone obrigatório' }, { status: 400 })
    }

    const cfg = await getGoldConfig()

    const callSid = `sim-gold-${Date.now()}`
    const digits = String(telefone).replace(/\D/g, '')
    const norm = digits.startsWith('55') ? digits : `55${digits}`

    const now = new Date().toISOString()
    const { error: insertError } = await supabase.from('ana_calls').insert({
      call_sid: callSid,
      telefone: norm,
      stage: 'apresentacao',
      status: 'active',
      gates_passed: [],
      memories: { telefone: norm, sim_browser: true, sim_gold: true, profile_version: ANA_PROFILE_GOLD.version },
      created_at: now,
      updated_at: now,
    })

    if (insertError) {
      console.error('[session-gold] insert error:', insertError)
      return NextResponse.json({ error: `DB insert failed: ${insertError.message}` }, { status: 500 })
    }

    const activeModel = model ?? cfg.model
    const activeVoice = voice ?? cfg.voice

    const turnDetection = cfg.vad_type === 'server_vad'
      ? { type: 'server_vad', threshold: cfg.vad_threshold, prefix_padding_ms: cfg.vad_prefix_padding_ms, silence_duration_ms: cfg.vad_silence_duration_ms }
      : { type: 'semantic_vad', eagerness: cfg.vad_eagerness }

    const oaiRes = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: activeModel,
          instructions: cfg.instructions,
          tools: [],
          output_modalities: ['audio'],
          max_output_tokens: cfg.max_output_tokens === 'inf' ? 'inf' : Number(cfg.max_output_tokens),
          reasoning: { effort: cfg.reasoning_effort },
          audio: {
            input: {
              format: { type: 'audio/pcm', rate: 24000 },
              transcription: { model: cfg.transcription_model, language: 'pt' },
              noise_reduction: { type: cfg.noise_reduction },
              turn_detection: turnDetection,
            },
            output: {
              format: { type: 'audio/pcm', rate: 24000 },
              voice: activeVoice,
            },
          },
        },
      }),
    })

    if (!oaiRes.ok) {
      const err = await oaiRes.text()
      return NextResponse.json({ error: `OpenAI error: ${err}` }, { status: 500 })
    }

    const session = await oaiRes.json()
    const clientSecret = session.value ?? session.client_secret?.value

    return NextResponse.json({
      callSid,
      telefone: norm,
      clientSecret,
      sessionId: session.session?.id ?? session.id,
      model: activeModel,
      voice: activeVoice,
      profileVersion: ANA_PROFILE_GOLD.version,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
