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

export async function createAnaMasterSession(twilioWebSocket: unknown) {
  const transport = new TwilioRealtimeTransportLayer({
    twilioWebSocket,
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

  await realtimeSession.connect({ apiKey: OPENAI_API_KEY })

  // Trigger ANA to speak first — outbound call, AI must initiate.
  // Try sendMessage first; fall back to raw response.create on OpenAI WS.
  setTimeout(() => {
    try {
      realtimeSession.sendMessage('iniciar')
      console.log('[ANA MASTER] sendMessage trigger enviado')
    } catch (e) {
      console.error('[ANA MASTER] sendMessage falhou, tentando response.create direto:', e)
    }

    // Also send response.create directly on the underlying OpenAI WebSocket
    try {
      const openaiWs = (transport as any)._ws
        ?? (transport as any).ws
        ?? (transport as any)._socket
      if (openaiWs?.readyState === 1) {
        openaiWs.send(JSON.stringify({
          type: 'conversation.item.create',
          item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'iniciar' }] },
        }))
        openaiWs.send(JSON.stringify({ type: 'response.create' }))
        console.log('[ANA MASTER] response.create direto enviado via OpenAI WS')
      } else {
        console.log('[ANA MASTER] OpenAI WS state:', openaiWs?.readyState)
      }
    } catch (e2) {
      console.error('[ANA MASTER] response.create direto falhou:', e2)
    }
  }, 1000)

  return realtimeSession
}
