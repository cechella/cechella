import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GOLDEN_PROMPT } from '@/lib/ana-master/constants'
import { ANA_PROFILE_GOLD } from '@/lib/ana-master/runtime-profile'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const GOLD_PROFILE = ANA_PROFILE_GOLD
const vad = GOLD_PROFILE.vad as { type: 'server_vad'; threshold: number; prefix_padding_ms: number; silence_duration_ms: number }

export async function POST(req: NextRequest) {
  try {
    const { telefone, voice, model } = await req.json()

    if (!telefone) {
      return NextResponse.json({ error: 'telefone obrigatório' }, { status: 400 })
    }

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
      memories: { telefone: norm, sim_browser: true, sim_gold: true, profile_version: GOLD_PROFILE.version },
      created_at: now,
      updated_at: now,
    })

    if (insertError) {
      console.error('[session-gold] insert error:', insertError)
      return NextResponse.json({ error: `DB insert failed: ${insertError.message}` }, { status: 500 })
    }

    // Payload exato do OpenAI Playground — espelho do "View Code" em platform.openai.com/audio/realtime
    const oaiRes = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session: {
          type: 'realtime',
          model: model ?? GOLD_PROFILE.model,
          instructions: GOLDEN_PROMPT,
          tools: [],
          output_modalities: ['audio'],
          max_output_tokens: 'inf',
          reasoning: { effort: 'low' },
          audio: {
            input: {
              format: { type: 'audio/pcm', rate: 24000 },
              transcription: { model: GOLD_PROFILE.transcription_model, language: 'pt' },
              noise_reduction: { type: GOLD_PROFILE.noise_reduction },
              turn_detection: {
                type: 'server_vad',
                threshold: vad.threshold,
                prefix_padding_ms: vad.prefix_padding_ms,
                silence_duration_ms: vad.silence_duration_ms,
              },
            },
            output: {
              format: { type: 'audio/pcm', rate: 24000 },
              voice: voice ?? GOLD_PROFILE.voice,
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
      model: model ?? GOLD_PROFILE.model,
      voice: voice ?? GOLD_PROFILE.voice,
      profileVersion: GOLD_PROFILE.version,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
