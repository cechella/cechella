import { z } from 'zod'
import { validateGate } from '../gate-validator.js'
import { GateId, GATES } from '../state-machine.js'
import { getLeadByPhone, getMemories, saveMemory, verifyPayment, checkReferidos } from '../supabase.js'
import { sendWhatsApp, iniciarColetaReferidos } from './whatsapp.js'

export type SessionRef = {
  callSid: string
  telefone: string
  updateInstructions: (instructions: string) => Promise<void>
}

export function buildTools(session: SessionRef) {
  return [
    {
      name: 'gateValidator',
      description:
        'Valida o gate atual no servidor. Chame quando a etapa estiver concluída. O servidor decide se pode avançar — você nunca avança sozinho.',
      parameters: z.object({
        gate_id: z
          .enum(GATES as unknown as [string, ...string[]])
          .describe('ID do gate a validar'),
        evidence: z
          .record(z.string(), z.unknown())
          .describe('Evidências coletadas nesta etapa'),
      }),
      execute: async ({
        gate_id,
        evidence,
      }: {
        gate_id: string
        evidence: Record<string, unknown>
      }) => {
        const result = await validateGate(
          gate_id as GateId,
          { ...evidence, telefone: session.telefone } as any,
          session.callSid,
        )

        if (result.approved && result.next_instructions) {
          await session.updateInstructions(result.next_instructions)
        }

        return result.approved
          ? `✅ ${result.reason} Avançando para: ${result.next_stage}`
          : `⛔ Gate não aprovado: ${result.reason}. Continue nesta etapa.`
      },
    },

    {
      name: 'get_lead_context',
      description: 'Recupera contexto da lead: nome, quem indicou, histórico de memórias.',
      parameters: z.object({}),
      execute: async () => {
        const [lead, memories] = await Promise.all([
          getLeadByPhone(session.telefone),
          getMemories(session.callSid),
        ])
        return JSON.stringify({ lead, memories })
      },
    },

    {
      name: 'save_memory',
      description:
        'Salva uma informação importante da lead para uso posterior na ligação.',
      parameters: z.object({
        key: z.string().describe('Chave da memória (ex: contexto_vida, interesse_protocolo)'),
        value: z.string().describe('Valor a salvar'),
      }),
      execute: async ({ key, value }: { key: string; value: string }) => {
        await saveMemory(session.callSid, key, value)
        return `Memória "${key}" salva.`
      },
    },

    {
      name: 'verificar_pagamento',
      description: 'Verifica no sistema se o pagamento da lead foi confirmado.',
      parameters: z.object({}),
      execute: async () => {
        const pago = await verifyPayment(session.telefone)
        return pago
          ? 'Pagamento confirmado! ✅'
          : 'Pagamento ainda não confirmado. Aguarde e verifique novamente em alguns instantes.'
      },
    },

    {
      name: 'iniciar_coleta_referidos',
      description:
        'Envia o link de indicações no WhatsApp da lead. SOMENTE após pagamento confirmado. O link é o ÚNICO canal — nunca colete contatos por voz.',
      parameters: z.object({}),
      execute: async () => {
        const result = await iniciarColetaReferidos(session.telefone)
        if (!result) {
          return 'Pagamento não confirmado — não é possível enviar o link ainda.'
        }
        await saveMemory(session.callSid, 'token_indicacao', result.token)
        return `Link enviado no WhatsApp: ${result.link}. Token: ${result.token}. Aguarde a lead abrir o link.`
      },
    },

    {
      name: 'verificar_referidos',
      description:
        'Verifica o progresso do formulário de indicações. Chame a cada 2 minutos após enviar o link.',
      parameters: z.object({}),
      execute: async () => {
        const memories = await getMemories(session.callSid)
        const token = memories.token_indicacao as string | undefined
        if (!token) return 'Token não encontrado. O link foi enviado?'
        const ref = await checkReferidos(token)
        if (ref.missaoCompleta) {
          return '✅ Missão completa! 20+ indicadas, semDados=0. Pode chamar gateValidator GATE_REFERIDOS.'
        }
        if (ref.semDados > 0) {
          return `⏳ ${ref.semDados} indicadas ainda sem profissão/hobby. Peça para a lead completar no formulário.`
        }
        return `⏳ Formulário em andamento. completo=${ref.completo}, semDados=${ref.semDados}`
      },
    },

    {
      name: 'send_whatsapp',
      description: 'Envia uma mensagem de texto no WhatsApp da lead.',
      parameters: z.object({
        mensagem: z.string().describe('Texto a enviar'),
      }),
      execute: async ({ mensagem }: { mensagem: string }) => {
        await sendWhatsApp(session.telefone, mensagem)
        return 'Mensagem enviada.'
      },
    },
  ]
}
