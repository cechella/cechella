import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime'
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions'
import { OPENAI_API_KEY, REALTIME_DEFAULTS } from './config.js'
import { ANA_BASE_PROMPT, STAGE_INSTRUCTIONS } from './state-machine.js'
import { buildTools, SessionRef } from './tools/index.js'
import { upsertCall, saveMemory, appendTranscript, supabase } from './supabase.js'
import { pushTranscriptEvent } from './sse-registry.js'
import { initialSpeechProgress, classifyLeadTurn, getPartInstruction, LeadTurnDisposition } from './speech-progress.js'

const ANA_SYSTEM_PROMPT = `${ANA_BASE_PROMPT}

INÍCIO: Você recebe a ligação e fala PRIMEIRO. Comece agora pela Etapa 1.

${STAGE_INSTRUCTIONS.apresentacao}`

async function loadGoldenPrompt(): Promise<string> {
  try {
    const { data } = await supabase
      .from('ana_realtime_profiles')
      .select('instructions')
      .eq('profile', 'gold')
      .single()
    if (data?.instructions) return data.instructions as string
  } catch (e) {
    console.error('[ANA MASTER] Failed to load GOLDEN_PROMPT from Supabase, falling back:', e)
  }
  return ANA_SYSTEM_PROMPT
}

// gpt-realtime-2.1 envia PCM 24kHz no output apesar de output_audio_format=g711_ulaw.
// Intercepta ws.send (server→Twilio) e converte PCM 16-bit LE 24kHz → mulaw 8kHz.
function linearToMulaw(s: number): number {
  const BIAS = 0x84, CLIP = 32635
  const sign = s < 0 ? 0x80 : 0
  if (s < 0) s = -s
  if (s > CLIP) s = CLIP
  s += BIAS
  let exp = 7
  for (let mask = 0x4000; (s & mask) === 0 && exp > 0; mask >>= 1) exp--
  return (~(sign | (exp << 4) | ((s >> (exp + 3)) & 0x0F))) & 0xFF
}

function pcm16_24k_to_mulaw8k(input: Buffer): Buffer {
  const outLen = Math.floor(input.length / 6)
  const out = Buffer.allocUnsafe(outLen)
  for (let i = 0; i < outLen; i++) {
    const s0 = input.readInt16LE(i * 6)
    const s1 = input.readInt16LE(i * 6 + 2)
    const s2 = input.readInt16LE(i * 6 + 4)
    out[i] = linearToMulaw(Math.round((s0 + s1 + s2) / 3))
  }
  return out
}

function mulawToLinear(u: number): number {
  u = (~u) & 0xFF
  const sign = u & 0x80
  const exp = (u >> 4) & 0x07
  const mantissa = u & 0x0F
  let value = ((mantissa << 1) + 33) << exp
  value -= 33
  return sign ? -value : value
}

// Inbound: Twilio mulaw 8kHz → PCM 24kHz (gpt-realtime-2.1 ignora g711_ulaw input)
function wrapTwilioInputMulawToPcm(ws: any): any {
  const originalOn = ws.on.bind(ws)
  ws.on = function (event: string, handler: any, ...rest: any[]) {
    if (event === 'message') {
      return originalOn(event, (data: any) => {
        try {
          const msg = JSON.parse(data.toString())
          if (msg.event === 'media' && msg.media?.payload) {
            const mulaw = Buffer.from(msg.media.payload, 'base64')
            const out = Buffer.allocUnsafe(mulaw.length * 6)
            for (let i = 0; i < mulaw.length; i++) {
              const s = mulawToLinear(mulaw[i])
              out.writeInt16LE(s, i * 6)
              out.writeInt16LE(s, i * 6 + 2)
              out.writeInt16LE(s, i * 6 + 4)
            }
            msg.media.payload = out.toString('base64')
            handler(JSON.stringify(msg))
            return
          }
        } catch { /* non-media pass through */ }
        handler(data)
      }, ...rest)
    }
    return originalOn(event, handler, ...rest)
  }
  return ws
}

function wrapTwilioWithPcmToMulaw(ws: any): any {
  const originalSend = ws.send.bind(ws)
  let detectedFormat: 'pcm' | 'mulaw' | 'unknown' = 'unknown'
  ws.send = function (data: any) {
    try {
      const msg = JSON.parse(data)
      if (msg.event === 'media' && msg.media?.payload) {
        const raw = Buffer.from(msg.media.payload, 'base64')
        if (detectedFormat === 'unknown') {
          // mulaw 8kHz 20ms ≈ 160 bytes; PCM 24kHz 20ms ≈ 960 bytes
          detectedFormat = raw.length <= 200 ? 'mulaw' : 'pcm'
          console.log('[ANA MASTER] output format detected:', detectedFormat, '| payload bytes:', raw.length)
        }
        if (detectedFormat === 'pcm') {
          msg.media.payload = pcm16_24k_to_mulaw8k(raw).toString('base64')
          originalSend(JSON.stringify(msg))
          return
        }
      }
    } catch { /* non-media frames pass through */ }
    originalSend(data)
  }
  return ws
}

export async function createAnaMasterSession(twilioWebSocket: unknown, opts: { contexto?: string } = {}) {
  // Note: opts.contexto comes from server.ts req.query which is always empty for Twilio WebSocket.
  // The real contexto arrives in the Twilio 'start' event customParameters — handled below.
  // We start with base prompt and upgrade to GOLDEN_PROMPT after 'start' fires if contexto=gold.
  const instructions = ANA_SYSTEM_PROMPT
  console.log('[ANA MASTER] session starting — awaiting start event for contexto')

  // INBOUND: mulaw→PCM (gpt-realtime-2.1 ignora g711_ulaw input) + session.update pcm16
  // OUTBOUND: PCM→mulaw (gpt-realtime-2.1 ignora g711_ulaw output)
  // silence padding do transport injeta 0xff diretamente (não passa pelo wrapper) — inofensivo
  const transport = new TwilioRealtimeTransportLayer({
    twilioWebSocket: wrapTwilioWithPcmToMulaw(wrapTwilioInputMulawToPcm(twilioWebSocket)),
  } as any)

  // SessionRef is mutable — callSid/telefone are filled from the Twilio 'start' event
  const sessionRef: SessionRef = {
    callSid: 'unknown',
    telefone: '',
    goldenMode: false,
    speechProgress: initialSpeechProgress(),
    updateInstructions: async (instructions: string) => {
      await (realtimeSession as any).updateSession({
        instructions: `${ANA_BASE_PROMPT}\n\n${instructions}`,
      })
    },
    onLeadTurn: async (transcript: string) => {
      if (sessionRef.goldenMode) return  // gold: ANA segue GOLDEN_PROMPT livremente
      const sp = sessionRef.speechProgress
      if (!sp.waiting_for_lead) return

      const disposition: LeadTurnDisposition = classifyLeadTurn(transcript, sp.state)
      sp.last_lead_disposition = disposition
      console.log(`[SPEECH PROGRESS] lead turn — disposition=${disposition} parte_atual=${sp.parte_atual} state=${sp.state}`)

      if (sp.state === 'WAITING_FINAL_RESPONSE') {
        // Final question response — always inject awaiting_final instruction
        sp.waiting_for_lead = false
        await sessionRef.updateInstructions(getPartInstruction('awaiting_final'))
        return
      }

      if (sp.state !== 'WAITING_LEAD') return

      switch (disposition) {
        case 'BACKCHANNEL':
        case 'CONTINUE': {
          // Lead confirmed — unlock next part (parts 1-3 only; part 4 injects final_question directly)
          const next = String(sp.parte_atual)
          sp.waiting_for_lead = false
          if (typeof sp.parte_atual === 'number') sp.parte_em_execucao = sp.parte_atual
          await sessionRef.updateInstructions(getPartInstruction(next))
          break
        }
        case 'QUESTION': {
          // ANA answers, then backend re-evaluates on next turn
          // Keep waiting_for_lead=true so after ANA answers, next lead turn is classified again
          // But also allow ANA to continue if question is resolved (ANA calls registrar_parte after)
          // No instruction change — ANA handles naturally with current context
          break
        }
        case 'INTERRUPTION': {
          sp.parte_interrompida = true
          // No instruction change — ANA must complete interrupted part before registering
          break
        }
        case 'CONFUSION':
        case 'OBJECTION':
        case 'UNKNOWN':
          // Stay in current state — ANA handles naturally
          break
      }
    },
  }

  const agent = new RealtimeAgent({
    name: 'ANA',
    instructions,
    voice: REALTIME_DEFAULTS.voice as any,
    tools: buildTools(sessionRef) as any,
  })

  let realtimeSession: RealtimeSession

  realtimeSession = new RealtimeSession(agent, {
    transport,
    model: REALTIME_DEFAULTS.model,
  } as any)

  // INBOUND_AUDIO_DIAGNOSTIC: count every Twilio event type to prove audio chain
  const DIAG = process.env.INBOUND_AUDIO_DIAGNOSTIC === 'true'
  let mediaCount = 0
  let totalInboundBytes = 0

  // Capture callSid/telefone from the Twilio 'start' event.
  // The Transport emits '*' events for every Twilio message — we listen before connecting
  // so we don't miss 'start' (which fires early in the stream lifecycle).
  let dbInitialized = false
  ;(transport as any).on('*', async (event: any) => {
    if (event?.type !== 'twilio_message') return
    const msg = event.message ?? event.data

    if (DIAG) {
      const evtType = msg?.event ?? 'unknown'
      if (evtType === 'media') {
        mediaCount++
        const payloadLen = msg?.media?.payload?.length ?? 0
        totalInboundBytes += payloadLen
        if (mediaCount % 50 === 1) { // log every 50 frames (~1s at Twilio 8kHz/20ms)
          console.log(`[INBOUND TEST] media_count=${mediaCount} payload_bytes=${payloadLen} total_bytes=${totalInboundBytes} streamSid=${msg?.streamSid ?? '?'}`)
        }
      } else {
        console.log(`[INBOUND TEST] event=${evtType}`, JSON.stringify(msg).slice(0, 200))
      }
    }

    if (msg?.event === 'start' && !dbInitialized) {
      dbInitialized = true
      const callSid = msg.start?.callSid
        ?? msg.start?.customParameters?.callSid
        ?? `stream_${msg.start?.streamSid ?? Date.now()}`
      const telefone = String(msg.start?.customParameters?.from ?? '').replace(/\D/g, '')
      const contextoFromStart = String(msg.start?.customParameters?.contexto ?? '')
      sessionRef.callSid = callSid
      sessionRef.telefone = telefone
      console.log('[ANA MASTER] start event — callSid:', callSid, '| telefone:', telefone, '| contexto:', contextoFromStart)
      await upsertCall(callSid, telefone).catch(() => {})
      await saveMemory(callSid, 'telefone', telefone).catch(() => {})
      // Load GOLDEN_PROMPT if contexto=gold and update session instructions
      if (contextoFromStart === 'gold') {
        sessionRef.goldenMode = true
        console.log('[ANA MASTER] contexto=gold — goldenMode ativo, speech-progress desabilitado')
        console.log('[ANA MASTER] contexto=gold — carregando GOLDEN_PROMPT do Supabase')
        loadGoldenPrompt().then((goldenInstructions) => {
          ;(realtimeSession as any).updateSession?.({ instructions: goldenInstructions })
            ?.catch?.((e: unknown) => console.error('[ANA MASTER] updateSession gold failed:', e))
          console.log('[ANA MASTER] GOLDEN_PROMPT aplicado — length:', goldenInstructions.length)
        }).catch((e: unknown) => console.error('[ANA MASTER] loadGoldenPrompt failed:', e))
      }
    }

    if (msg?.event === 'stop' && DIAG) {
      console.log(`[INBOUND TEST] CALL ENDED — total media_count=${mediaCount} total_bytes=${totalInboundBytes}`)
    }
  })

  // Prevent unhandled error crash if OpenAI rejects the session
  realtimeSession.on('error', (err: unknown) => {
    console.error('[ANA MASTER] RealtimeSession error:', err)
  })

  // Debug: log session config and VAD events
  ;(transport as any).on('*', (event: any) => {
    if (event?.type === 'session.updated') {
      const s = event?.session ?? {}
      console.log('[ANA MASTER] session.updated —',
        'input_audio_format:', s.input_audio_format,
        '| output_audio_format:', s.output_audio_format,
        '| turn_detection:', JSON.stringify(s.turn_detection),
        '| input_audio_transcription:', JSON.stringify(s.input_audio_transcription),
      )
      if (DIAG) console.log('[DIAG] session completa:', JSON.stringify(s))
    }
    if (event?.type === 'response.output_audio.delta') {
      console.log('[ANA MASTER] audio delta recebido — bytes:', event?.delta?.length ?? 0)
    }
    if (event?.type === 'response.done') {
      console.log('[ANA MASTER] response.done')
    }
    if (event?.type === 'input_audio_buffer.speech_started') {
      console.log('[ANA MASTER] 🎤 VAD: fala detectada!')
    }
    if (event?.type === 'input_audio_buffer.speech_stopped') {
      console.log('[ANA MASTER] 🎤 VAD: fala parou')
    }
    if (event?.type === 'input_audio_buffer.committed') {
      console.log('[ANA MASTER] 🎤 audio buffer committed')
    }
    if (event?.type === 'conversation.item.input_audio_transcription.completed') {
      const text = event?.transcript as string | undefined
      console.log('[ANA MASTER] 📝 user:', text)
      if (text && sessionRef.callSid !== 'unknown') {
        appendTranscript(sessionRef.callSid, 'user', text).catch(() => {})
        pushTranscriptEvent(sessionRef.callSid, 'user', text)
        // Speech progress: classify lead turn and potentially unlock next part
        if (sessionRef.speechProgress.waiting_for_lead) {
          sessionRef.onLeadTurn(text).catch(() => {})
        }
      }
    }
    if (event?.type === 'response.done') {
      const output: any[] = event?.response?.output ?? []
      for (const item of output) {
        for (const content of (item?.content ?? [])) {
          const text = content?.transcript ?? content?.text
          console.log('[ANA MASTER] 📝 assistant raw:', JSON.stringify({ type: content?.type, transcript: content?.transcript, text: content?.text }))
          if (text && sessionRef.callSid !== 'unknown') {
            appendTranscript(sessionRef.callSid, 'assistant', text).catch(() => {})
            pushTranscriptEvent(sessionRef.callSid, 'assistant', text)
          }
        }
      }
    }
  })

  await realtimeSession.connect({ apiKey: OPENAI_API_KEY })

  // Sobrescreve input_audio_format para pcm16 — transport configura g711_ulaw mas
  // convertemos o inbound para PCM antes de chegar na OpenAI.
  ;(transport as any).sendEvent?.({
    type: 'session.update',
    session: {
      type: 'realtime',
      input_audio_format: 'pcm16',
      input_audio_transcription: { model: 'gpt-4o-transcribe' },
    },
  })?.catch?.(() => {})

  // Trigger ANA to speak first — outbound call, AI must initiate.
  setTimeout(() => {
    try {
      realtimeSession.sendMessage('iniciar')
      console.log('[ANA MASTER] sendMessage trigger enviado')
    } catch (e) {
      console.error('[ANA MASTER] sendMessage falhou:', e)
    }
  }, 1000)

  return realtimeSession
}
