import { RealtimeAgent, RealtimeSession } from '@openai/agents/realtime'
import { TwilioRealtimeTransportLayer } from '@openai/agents-extensions'
import { OPENAI_API_KEY, REALTIME_DEFAULTS } from './config.js'
import { STAGE_INSTRUCTIONS } from './state-machine.js'
import { buildTools, SessionRef } from './tools/index.js'
import { upsertCall, saveMemory } from './supabase.js'

const ANA_SYSTEM_PROMPT = `Você é ANA — Agente de Nutrição e Ativação da Hormone Ecosystem. Você é consultora de vendas por voz especializada em implantes hormonais para mulheres.

IDENTIDADE: Voz calorosa, humana, empática. Você se importa genuinamente com cada mulher que atende. Você nunca soa como robô.

REGRAS ABSOLUTAS — NUNCA QUEBRE:
1. Você NUNCA avança de etapa sozinha. Sempre chame gateValidator e aguarde aprovação do servidor.
2. Você NUNCA coleta contatos de referidos por voz ou texto. O link é o ÚNICO canal.
3. Parcelamento é SEMPRE "até 6x sem juros" — nunca mencione 12x ou qualquer outro número.
4. GANHO só é gravado pelo servidor após GATE_VALIDACAO — você não anuncia GANHO, o servidor faz isso.
5. Você não encerra a ligação enquanto a Etapa 8 não for concluída com sucesso.
6. Se a lead não conseguir abrir o link de referidos: fique na ligação, resolva, reenvie. Nunca desista.

BASE CIENTÍFICA: Implante hormonal = pellet do tamanho de um grão de arroz, inserido sob a pele, libera hormônios de forma contínua e estável por até 6 meses. Resultados: sono, energia, libido, fogachos (2-4 semanas), proteção cardiovascular e óssea a longo prazo.

INÍCIO: Você recebe a ligação e fala PRIMEIRO. Comece agora pela Etapa 1.

${STAGE_INSTRUCTIONS.apresentacao}`

// gpt-realtime-2.1 ignores g711_ulaw format request and sends PCM 24kHz.
// Twilio expects mulaw 8kHz, so we intercept the WebSocket send and convert.
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
  const outLen = Math.floor(input.length / 6) // 3 samples * 2 bytes = 6 bytes per output byte
  const out = Buffer.allocUnsafe(outLen)
  for (let i = 0; i < outLen; i++) out[i] = linearToMulaw(input.readInt16LE(i * 6))
  return out
}

export async function createAnaMasterSession(twilioWebSocket: unknown) {
  const transport = new TwilioRealtimeTransportLayer({
    twilioWebSocket: wrapTwilioWithPcmToMulaw(twilioWebSocket),
  } as any)

  // SessionRef is mutable — callSid/telefone are filled from the Twilio 'start' event
  const sessionRef: SessionRef = {
    callSid: 'unknown',
    telefone: '',
    updateInstructions: async (instructions: string) => {
      await (realtimeSession as any).updateSession({ instructions })
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

  // Capture callSid/telefone from the Twilio 'start' event.
  // The Transport emits '*' events for every Twilio message — we listen before connecting
  // so we don't miss 'start' (which fires early in the stream lifecycle).
  let dbInitialized = false
  ;(transport as any).on('*', async (event: any) => {
    if (event?.type !== 'twilio_message') return
    const msg = event.message ?? event.data
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
  })

  // Prevent unhandled error crash if OpenAI rejects the session
  realtimeSession.on('error', (err: unknown) => {
    console.error('[ANA MASTER] RealtimeSession error:', err)
  })

  // Debug: log session config confirmed by OpenAI
  ;(transport as any).on('*', (event: any) => {
    if (event?.type === 'session.updated') {
      const fmt = event?.session?.audio?.output?.format
      console.log('[ANA MASTER] session.updated — output format:', JSON.stringify(fmt))
    }
    if (event?.type === 'response.output_audio.delta') {
      console.log('[ANA MASTER] audio delta recebido — bytes:', event?.delta?.length ?? 0)
    }
    if (event?.type === 'response.done') {
      console.log('[ANA MASTER] response.done')
    }
  })

  await realtimeSession.connect({ apiKey: OPENAI_API_KEY })

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
