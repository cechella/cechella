import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime'
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions'
import { OPENAI_API_KEY, REALTIME_DEFAULTS } from './config.js'
import { STAGE_INSTRUCTIONS } from './state-machine.js'
import { buildTools, SessionRef } from './tools/index.js'
import { upsertCall, saveMemory, appendTranscript } from './supabase.js'

const ANA_BASE_PROMPT = `Você é ANA — consultora de saúde hormonal da Hormone Ecosystem. Sua missão: reproduzir o modelo mental comercial do fundador Dr. Vinícius Sechella — condução com intenção, presença humana genuína, adaptação real à lead, disciplina no processo.

DNA GOLD STANDARD v1 — MODELO MENTAL DO FUNDADOR:
• Convicção: Trate solução, preço, pagamento e referidos como partes naturais do processo. Nunca peça desculpas por conduzir. Conduza com segurança e respeito.
• Velocidade: Ritmo varia por etapa — não há cadência única. Ajuste conforme o estado emocional da lead e o objetivo daquele momento.
• Memória: Use contexto anterior para criar continuidade. A dor relatada personaliza o speech. A origem da indicação retorna nos referidos. O combinado retorna no fechamento.
• Simplicidade: Autoridade sem palestra. Analogias acessíveis. Evite monólogo técnico.
• Decisão: Cada pergunta tem função comercial ou conversacional — não faça perguntas de checklist. Perguntas criam compromisso ou reduzem incerteza.
• Objeções: OUVIR → ISOLAR → CONFIRMAR → OFERECER → TESTAR → AJUSTAR → DECIDIR. Nunca rebata antes de entender a causa real. "Essa é a única razão?" isola antes de responder.
• Reciprocidade: Referidos nascem da narrativa da própria venda. Crie sentido antes de pedir ação.
• Disciplina: Naturalidade não pode destruir o processo. As 8 etapas são cumpridas até validação — sem atalhos.

IDIOMA: Português brasileiro exclusivo. Se a lead falar outro idioma, responda em português naturalmente sem comentar.

FERRAMENTAS INTERNAS — INVISÍVEIS PARA A LEAD:
NUNCA diga "só um instante", "deixa eu organizar", "aguardando", "processando" ou qualquer coisa que indique processo técnico. Durante tool calls: continue a conversa naturalmente ou aguarde em silêncio. A conversa flui como se você soubesse tudo intuitivamente.

SEQUÊNCIA DAS ETAPAS:
Você segue 8 etapas em ordem ESTRITA. Foque exclusivamente no objetivo da etapa atual — não invente perguntas de outras etapas, não acrescente temas não listados na instrução.

ANTI-GOLD — NUNCA FAÇA:
• Repetir "perfeito", "obrigada", "que bom", "ótimo" de forma automática — varie e reaja ao conteúdo real da lead
• Fazer perguntas apenas para preencher campos — cada pergunta tem função
• Confirmar ações não executadas pelo backend ("já enviei", "já recebi")
• Fazer triagem médica ou clínica fora da etapa atual
• Transformar o speech em texto fixo — adapte à lead real
• Confundir Validação com Encerramento

REGRAS ABSOLUTAS:
1. Chame gateValidator IMEDIATAMENTE ao ter as evidências — não adie, não adicione perguntas extras.
2. Nunca colete referidos por voz — o link WhatsApp é o ÚNICO canal.
3. Parcelamento: SEMPRE "até 6x sem juros" — nunca mencione 12x.
4. GANHO só é registrado após GATE_VALIDACAO — o servidor faz isso.
5. Não encerre antes da Etapa 8 concluída.

BASE CIENTÍFICA (USE SOMENTE NA ETAPA 4):
Implante hormonal = pellet do tamanho de um grão de arroz, inserido sob a pele, liberação hormonal contínua por até 6 meses. Resultados: sono, energia, libido, fogachos (2-4 semanas), proteção cardiovascular e óssea. Adapte à dor da lead — nunca use texto fixo.`

const ANA_SYSTEM_PROMPT = `${ANA_BASE_PROMPT}

INÍCIO: Você recebe a ligação e fala PRIMEIRO. Comece agora pela Etapa 1.

${STAGE_INSTRUCTIONS.apresentacao}`

// ── Audio conversion helpers ───────────────────────────────────────────────────
//
// gpt-realtime-2.1 ignores the g711_ulaw format request on BOTH directions:
//   OUTPUT: model sends PCM 24kHz → we convert to mulaw 8kHz before sending to Twilio
//   INPUT:  Twilio sends mulaw 8kHz → we convert to PCM 24kHz before OpenAI receives it

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

function mulawToLinear(u: number): number {
  u = (~u) & 0xFF
  const sign = u & 0x80
  const exp = (u >> 4) & 0x07
  const mantissa = u & 0x0F
  let value = ((mantissa << 1) + 33) << exp
  value -= 33
  return sign ? -value : value
}

function pcm16_24k_to_mulaw8k(input: Buffer): Buffer {
  const outLen = Math.floor(input.length / 6) // downsample 3:1 then encode
  const out = Buffer.allocUnsafe(outLen)
  for (let i = 0; i < outLen; i++) out[i] = linearToMulaw(input.readInt16LE(i * 6))
  return out
}

function mulaw8k_to_pcm16_24k(input: Buffer): Buffer {
  const out = Buffer.allocUnsafe(input.length * 6) // upsample 3:1
  for (let i = 0; i < input.length; i++) {
    const s = mulawToLinear(input[i])
    out.writeInt16LE(s, i * 6)
    out.writeInt16LE(s, i * 6 + 2)
    out.writeInt16LE(s, i * 6 + 4)
  }
  return out
}

// Intercept WebSocket.send (server→Twilio): convert PCM 24kHz → mulaw 8kHz
function wrapTwilioWithPcmToMulaw(ws: any): any {
  const originalSend = ws.send.bind(ws)
  ws.send = function (data: any) {
    try {
      const msg = JSON.parse(data)
      if (msg.event === 'media' && msg.media?.payload) {
        const pcm = Buffer.from(msg.media.payload, 'base64')
        msg.media.payload = pcm16_24k_to_mulaw8k(pcm).toString('base64')
        originalSend(JSON.stringify(msg))
        return
      }
    } catch { /* non-media frames pass through unchanged */ }
    originalSend(data)
  }
  return ws
}

// Intercept WebSocket.on('message') (Twilio→server): convert inbound mulaw 8kHz → PCM 24kHz
// so OpenAI (which ignores g711_ulaw input format) receives valid PCM audio.
function wrapTwilioInputMulawToPcm(ws: any): any {
  const originalOn = ws.on.bind(ws)
  ws.on = function (event: string, handler: any, ...rest: any[]) {
    if (event === 'message') {
      return originalOn(event, (data: any) => {
        try {
          const msg = JSON.parse(data.toString())
          if (msg.event === 'media' && msg.media?.payload) {
            const mulaw = Buffer.from(msg.media.payload, 'base64')
            msg.media.payload = mulaw8k_to_pcm16_24k(mulaw).toString('base64')
            handler(JSON.stringify(msg))
            return
          }
        } catch { /* non-media frames pass through unchanged */ }
        handler(data)
      }, ...rest)
    }
    return originalOn(event, handler, ...rest)
  }
  return ws
}

export async function createAnaMasterSession(twilioWebSocket: unknown) {
  // Pipeline de áudio (PROVADO por diagnóstico — gpt-realtime-2.1 ignora g711_ulaw input):
  //
  // INBOUND  Twilio mulaw 8kHz
  //          → wrapTwilioInputMulawToPcm (mulaw→PCM 24kHz nos media events do WebSocket)
  //          → transport encaminha PCM para OpenAI
  //          → session.update declara input_audio_format=pcm16 (sobrescreve g711_ulaw do transport)
  //          → OpenAI VAD detecta fala ✓
  //
  // OUTBOUND OpenAI PCM 24kHz (ignora output_audio_format=g711_ulaw)
  //          → transport encaminha raw
  //          → wrapTwilioWithPcmToMulaw (PCM→mulaw 8kHz)
  //          → Twilio toca áudio ✓
  //
  // CAVEAT: transport injeta silence padding mulaw internamente (não passa pelo wrapper).
  // Em chamadas ativas (sem gaps no stream) isso é inofensivo — 0xff como PCM ≈ zero.

  console.log('[ANA MASTER] PIPELINE:',
    'TWILIO_IN=mulaw8k→PCM24k(wrapper)',
    '| OPENAI_IN=pcm16(declarado+convertido)',
    '| OPENAI_OUT=pcm24k(real)',
    '| TWILIO_OUT=mulaw8k(wrapper)',
  )

  const transport = new TwilioRealtimeTransportLayer({
    twilioWebSocket: wrapTwilioWithPcmToMulaw(wrapTwilioInputMulawToPcm(twilioWebSocket)),
  } as any)

  // SessionRef is mutable — callSid/telefone are filled from the Twilio 'start' event
  const sessionRef: SessionRef = {
    callSid: 'unknown',
    telefone: '',
    updateInstructions: async (instructions: string) => {
      await (realtimeSession as any).updateSession({
        instructions: `${ANA_BASE_PROMPT}\n\n${instructions}`,
      })
    },
  }

  const agent = new RealtimeAgent({
    name: 'ANA',
    instructions: ANA_SYSTEM_PROMPT,
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
      sessionRef.callSid = callSid
      sessionRef.telefone = telefone
      await upsertCall(callSid, telefone).catch(() => {})
      await saveMemory(callSid, 'telefone', telefone).catch(() => {})
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
          }
        }
      }
    }
  })

  await realtimeSession.connect({ apiKey: OPENAI_API_KEY })

  // Sobrescreve input_audio_format do transport (g711_ulaw → pcm16) pois convertemos
  // o áudio inbound antes de chegar na OpenAI. Habilita também transcrição.
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
