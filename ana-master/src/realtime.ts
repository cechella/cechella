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

export async function createAnaMasterSession(
  twilioWebSocket: unknown,
  callSid: string,
  telefone: string,
) {
  await upsertCall(callSid, telefone)
  await saveMemory(callSid, 'telefone', telefone)

  const transport = new TwilioRealtimeTransportLayer({
    twilioWebSocket,
  } as any)

  let realtimeSession: RealtimeSession

  const sessionRef: SessionRef = {
    callSid,
    telefone,
    updateInstructions: async (instructions: string) => {
      await (realtimeSession as any).updateSession({ instructions })
    },
  }

  const agent = new RealtimeAgent({
    name: 'ANA',
    instructions: ANA_SYSTEM_PROMPT,
    voice: REALTIME_DEFAULTS.voice,
    tools: buildTools(sessionRef) as any,
  })

  realtimeSession = new RealtimeSession(agent, {
    transport,
    model: REALTIME_DEFAULTS.model,
  } as any)

  await realtimeSession.connect({ apiKey: OPENAI_API_KEY })

  return realtimeSession
}
