import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime'
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions'
import { OPENAI_API_KEY, REALTIME_DEFAULTS, APP_URL } from './config.js'
import { buildTools, SessionRef } from './tools/index.js'
import { upsertCall, appendTranscript, updateCallStage, endCall, supabase } from './supabase.js'
import { pushTranscriptEvent, pushCallEndedEvent } from './sse-registry.js'
import { registerSession, unregisterSession } from './session-registry.js'

async function loadGoldenPrompt(): Promise<string> {
  try {
    const { data } = await supabase
      .from('ana_realtime_profiles')
      .select('instructions')
      .eq('profile', 'gold')
      .single()
    if (data?.instructions) return data.instructions as string
  } catch (e) {
    console.error('[ANA MASTER] Failed to load GOLDEN_PROMPT from Supabase:', e)
  }
  return 'Você é ANA, consultora de saúde hormonal da Hormone Ecosystem.'
}

// PCM/mulaw conversion — gpt-realtime-2.1 outputs PCM 24kHz regardless of format setting
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

// Passive stage detection from transcript — writes to DB for CRM display
const STAGE_PATTERNS: Array<{ stage: string; patterns: RegExp[] }> = [
  { stage: 'apresentacao', patterns: [/qual é o teu nome/i, /pra eu te chamar direitinho/i] },
  { stage: 'conexao',      patterns: [/me conta um pouco de como é o teu dia a dia/i] },
  { stage: 'combinado',    patterns: [/vamos fazer um combinad[ao]/i] },
  { stage: 'speech',       patterns: [/pellet/i, /implante hormonal/i, /grão de arroz/i] },
  { stage: 'fechamento',   patterns: [/lembra do nosso combinado/i, /pix ou cartão/i] },
  { stage: 'pagamento',    patterns: [/confirmei aqui/i, /pagamento recebido/i] },
  { stage: 'referidos',    patterns: [/você conhece alguma amiga/i, /tomou essa decisão/i] },
  { stage: 'encerramento', patterns: [/nossa equipe vai entrar em contato/i, /foi uma honra conversar/i] },
]

const STAGE_ORDER = ['apresentacao', 'conexao', 'combinado', 'speech', 'fechamento', 'pagamento', 'referidos', 'encerramento']

function makeStageTracker() {
  let currentIdx = -1
  return function advanceStage(callSid: string, text: string) {
    for (const { stage, patterns } of STAGE_PATTERNS) {
      if (patterns.some(p => p.test(text))) {
        const idx = STAGE_ORDER.indexOf(stage)
        if (idx > currentIdx) {
          currentIdx = idx
          console.log(`[ANA MASTER] 🎯 stage detected: ${stage} for ${callSid}`)
          updateCallStage(callSid, stage).catch(() => {})
        }
        break
      }
    }
  }
}

export async function createAnaMasterSession(twilioWebSocket: unknown, opts: { contexto?: string } = {}) {
  console.log('[ANA MASTER] session starting')

  // Stage tracker with in-memory current stage so auto-PIX knows when to fire
  let currentDetectedStage = 'apresentacao'
  const baseAdvanceStage = makeStageTracker()
  const advanceStage = (callSid: string, text: string) => {
    baseAdvanceStage(callSid, text)
    for (const { stage, patterns } of STAGE_PATTERNS) {
      if (patterns.some(p => p.test(text))) {
        const idx = STAGE_ORDER.indexOf(stage)
        if (idx > STAGE_ORDER.indexOf(currentDetectedStage)) {
          currentDetectedStage = stage
        }
        break
      }
    }
  }

  // Ana asks about payment method → set flag so auto-PIX knows to watch for "pix"/"cartão"
  let anaAskedPayment = false
  let pixAutoSent = false
  function noteAnaText(anaText: string) {
    if (!anaAskedPayment && /pix|cart[aã]o|pagamento|pagar/i.test(anaText)) {
      anaAskedPayment = true
      console.log('[ANA MASTER] 💬 Ana perguntou sobre pagamento — aguardando resposta da lead (fallback em 10s)')
      setTimeout(() => {
        if (!pixAutoSent && sessionRef.callSid !== 'unknown') {
          pixAutoSent = true
          const metodo = sessionRef.metodoEscolhido ?? 'pix'
          console.log(`[ANA MASTER] ⏰ timeout auto-PIX — metodo=${metodo} (fallback por transcrição irreconhecível)`)
          fetch(`${APP_URL}/api/admin/ana-master/simulador/pix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callSid: sessionRef.callSid, telefone: sessionRef.telefone, metodo }),
          }).catch((e: Error) => console.error('[ANA MASTER] timeout auto-PIX error:', e.message))
        }
      }, 10000)
    }
  }

  // Lead says "pix"/"cartão" after Ana asked → dispatch PIX immediately, no tool call needed.
  // This is the primary PIX dispatch mechanism — independent of model tool calls.
  function tryAutoPix(leadText: string, callSid: string, telefone: string) {
    if (pixAutoSent) return
    const stageOk = anaAskedPayment || ['fechamento', 'pagamento', 'referidos', 'encerramento'].includes(currentDetectedStage)
    if (!stageOk) return
    const t = leadText.toLowerCase()
    let metodo: 'pix' | 'cartao' | null = null
    if (/\bpix\b|ピック|picks?|pik|pixe|pix\s*(a|à)\s*vista|avista|à\s*vista/i.test(leadText)) metodo = 'pix'
    else if (/cart[aã]o|parcel/i.test(t)) metodo = 'cartao'
    if (!metodo) return
    pixAutoSent = true
    console.log(`[ANA MASTER] 💳 auto-PIX triggered — metodo=${metodo} telefone=${telefone}`)
    fetch(`${APP_URL}/api/admin/ana-master/simulador/pix`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callSid, telefone, metodo }),
    }).catch((e: Error) => console.error('[ANA MASTER] auto-PIX fetch error:', e.message))
  }

  const transport = new TwilioRealtimeTransportLayer({
    twilioWebSocket: wrapTwilioWithPcmToMulaw(wrapTwilioInputMulawToPcm(twilioWebSocket)),
  } as any)

  const sessionRef: SessionRef = {
    callSid: 'unknown',
    telefone: '',
    sendEvent: (ev: object) => (transport as any).sendEvent?.(ev)?.catch?.(() => {}),
  }

  const DIAG = process.env.INBOUND_AUDIO_DIAGNOSTIC === 'true'
  let mediaCount = 0
  let totalInboundBytes = 0
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
        if (mediaCount % 50 === 1) {
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
      sessionRef.callSid = callSid
      sessionRef.telefone = telefone
      console.log('[ANA MASTER] start event — callSid:', callSid, '| telefone:', telefone)
      await upsertCall(callSid, telefone).catch(() => {})

      // Register transport so payment webhook can inject confirmation
      registerSession(callSid, {
        sendEvent: (ev: object) => (transport as any).sendEvent?.(ev)?.catch?.(() => {}),
      })
    }

    if (msg?.event === 'stop') {
      if (DIAG) console.log(`[INBOUND TEST] CALL ENDED — total media_count=${mediaCount} total_bytes=${totalInboundBytes}`)
      if (sessionRef.callSid !== 'unknown') {
        pushCallEndedEvent(sessionRef.callSid)
        endCall(sessionRef.callSid).catch(() => {})
        unregisterSession(sessionRef.callSid)
      }
    }
  })

  const instructions = await loadGoldenPrompt()
  console.log('[ANA MASTER] GOLDEN_PROMPT loaded — length:', instructions.length)

  const tools = buildTools(sessionRef)
  console.log('[ANA MASTER] tools registradas:', tools.map(t => t.name).join(', '))

  const agent = new RealtimeAgent({
    name: 'ANA',
    instructions,
    voice: REALTIME_DEFAULTS.voice as any,
    tools: tools as any,
  })

  const realtimeSession = new RealtimeSession(agent, {
    transport,
    model: REALTIME_DEFAULTS.model,
  } as any)

  realtimeSession.on('error', (err: unknown) => {
    console.error('[ANA MASTER] RealtimeSession error:', err)
  })

  const processedItems = new Set<string>()

  ;(transport as any).on('*', (event: any) => {
    if (event?.type === 'session.updated') {
      const s = event?.session ?? {}
      console.log('[ANA MASTER] session.updated —',
        'input_audio_format:', s.input_audio_format,
        '| output_audio_format:', s.output_audio_format,
        '| turn_detection:', JSON.stringify(s.turn_detection),
      )
    }
    if (event?.type === 'response.audio_transcript.done') {
      const text = event?.transcript as string | undefined
      const itemId = event?.item_id as string | undefined
      if (text?.trim() && sessionRef.callSid !== 'unknown') {
        console.log('[ANA MASTER] 📝 assistant (transcript.done):', text)
        if (itemId) processedItems.add(itemId)
        appendTranscript(sessionRef.callSid, 'assistant', text).catch(() => {})
        pushTranscriptEvent(sessionRef.callSid, 'assistant', text)
        advanceStage(sessionRef.callSid, text)
        noteAnaText(text)
      }
    }
    if (event?.type === 'input_audio_buffer.speech_started') {
      console.log('[ANA MASTER] 🎤 VAD: fala detectada!')
    }
    if (event?.type === 'input_audio_buffer.speech_stopped') {
      console.log('[ANA MASTER] 🎤 VAD: fala parou')
    }
    if (event?.type === 'conversation.item.input_audio_transcription.completed') {
      const text = event?.transcript as string | undefined
      console.log('[ANA MASTER] 📝 user:', text)
      if (text && sessionRef.callSid !== 'unknown') {
        appendTranscript(sessionRef.callSid, 'user', text).catch(() => {})
        pushTranscriptEvent(sessionRef.callSid, 'user', text)
        tryAutoPix(text, sessionRef.callSid, sessionRef.telefone)

        // WAIT_FOR_YES: lead respondeu ao "Posso te pedir um favor?"
        if (sessionRef.waitForYes) {
          const t = text.toLowerCase()
          // Strict list — avoids false positives from Bluetooth echo transcriptions.
          // Removed: tá, ta, bom, oi, ola (too common in noise/echo artifacts).
          const isYes = /\b(sim|claro|pode|ok|com certeza|lógico|logico|vai|certo|fechado|obvio|obviamente|pode sim|claro que sim)\b/.test(t)
          if (isYes) {
            sessionRef.waitForYes = false
            sessionRef.referralsWaiting = true
            console.log('[ANA MASTER] ✅ WAIT_FOR_YES confirmado — disparando speech emocional')
            sessionRef.sendEvent?.({
              type: 'response.create',
              response: {
                instructions: `INSTRUÇÃO OBRIGATÓRIA: diga APENAS este discurso exato e nada mais: "Você acabou de tomar uma das melhores decisões da sua saúde. Tenho certeza que você conhece outras mulheres passando pelo mesmo que você passou — ondas de calor, cansaço, sono ruim, falta de energia... Vou te ensinar agora como me mandar os contatos direto pelo WhatsApp. É super fácil. Pode abrir o link que chegou aí?" — depois aguarde em silêncio.`,
              },
            })
          } else {
            // Pergunta ou resposta ambígua — responde normalmente (VAD captou, create_response=false, mas pode criar manual)
            const isQuestion = /\?/.test(text) || /como|o que|quando|onde|qual|por que|porque/.test(t)
            if (isQuestion) {
              console.log('[ANA MASTER] ❓ WAIT_FOR_YES — pergunta detectada, respondendo manualmente')
              sessionRef.sendEvent?.({ type: 'response.create' })
            }
          }
          return
        }

        // REFERRALS WAITING: lead executando ação — só responde a pergunta direta
        if (sessionRef.referralsWaiting) {
          const t = text.toLowerCase()
          const isQuestion = /\?/.test(text) || /\b(como|o que|quando|onde|qual|por que|porque|nao consigo|nao ta|não ta|não tá|nao tá|abri|enviei|mandei|consegui|pronto)\b/.test(t)
          if (isQuestion) {
            console.log('[ANA MASTER] ❓ REFERRALS WAITING — pergunta detectada, respondendo manualmente')
            sessionRef.sendEvent?.({ type: 'response.create' })
          } else {
            console.log('[ANA MASTER] 🔇 REFERRALS WAITING — silêncio (sem pergunta direta)')
          }
        }
      }
    }
    if (event?.type === 'response.done') {
      console.log('[ANA MASTER] response.done')

      // ETAPA 7: dispara a frase de abertura APÓS o response.done do tool call do pagamento.
      // Fazemos isso aqui (e não dentro do execute do tool) para garantir que o modelo não
      // insira texto próprio antes da frase — o response.cancel limpa qualquer saída em fila.
      if (sessionRef.pendingEtapa7) {
        sessionRef.pendingEtapa7 = false
        const nome = sessionRef.nomeLead ?? 'você'
        console.log(`[ANA MASTER] 🎯 pendingEtapa7 — cancelando saída e disparando frase ETAPA 7 callSid=${sessionRef.callSid}`)
        sessionRef.sendEvent?.({ type: 'response.cancel' })
        sessionRef.sendEvent?.({ type: 'output_audio_buffer.clear' })
        setTimeout(() => {
          sessionRef.sendEvent?.({
            type: 'response.create',
            response: {
              instructions: `INSTRUÇÃO OBRIGATÓRIA: diga APENAS esta frase exata e nada mais: "${nome}, você acabou de receber um link no seu WhatsApp. Posso te pedir um favor?" — depois fique em silêncio total. Não adicione nenhuma palavra antes ou depois desta frase.`,
            },
          })
        }, 150)
        return
      }

      const output: any[] = event?.response?.output ?? []
      for (const item of output) {
        if (item?.id && processedItems.has(item.id)) continue
        for (const content of (item?.content ?? [])) {
          const text = content?.transcript ?? content?.text
          if (text && sessionRef.callSid !== 'unknown') {
            console.log('[ANA MASTER] 📝 assistant raw (fallback):', text.slice(0, 100))
            appendTranscript(sessionRef.callSid, 'assistant', text).catch(() => {})
            pushTranscriptEvent(sessionRef.callSid, 'assistant', text)
            advanceStage(sessionRef.callSid, text)
            noteAnaText(text)
          }
        }
      }
      processedItems.clear()
    }
  })

  await realtimeSession.connect({ apiKey: OPENAI_API_KEY })

  ;(transport as any).sendEvent?.({
    type: 'session.update',
    session: {
      input_audio_format: 'pcm16',
      input_audio_transcription: { model: 'gpt-4o-transcribe', language: 'pt' },
      turn_detection: {
        type: 'semantic_vad',
        eagerness: 'low',
        create_response: true,
      },
      reasoning: { effort: 'low' },
    },
  })?.catch?.(() => {})

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
