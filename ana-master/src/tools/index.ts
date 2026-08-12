import { z } from 'zod'
import { validateGate } from '../gate-validator.js'
import { GateId, GATES } from '../state-machine.js'
import { getLeadByPhone, getMemories, saveMemory, verifyPayment, checkReferidos, saveSpeechProgress } from '../supabase.js'
import { sendWhatsApp, iniciarColetaReferidos } from './whatsapp.js'
import {
  SpeechProgress, initialSpeechProgress, isComplete,
  getPartInstruction, classifyLeadTurn, LeadTurnDisposition,
} from '../speech-progress.js'

export type SessionRef = {
  callSid: string
  telefone: string
  speechProgress: SpeechProgress
  updateInstructions: (instructions: string) => Promise<void>
  onLeadTurn: (transcript: string) => Promise<void>
}

export function buildTools(session: SessionRef) {
  return [
    {
      name: 'gateValidator',
      description:
        'Valida o gate atual no servidor. Chame quando a etapa estiver concluída. O servidor decide se pode avançar — você nunca avança sozinho. IMPORTANTE: o resultado desta ferramenta é INTERNO — nunca verbalize nem mencione para a lead que está validando, esperando aprovação, ou que houve qualquer processo técnico. Continue a conversa naturalmente.',
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
          {
            ...evidence,
            telefone: session.telefone,
            speech_progress_complete: isComplete(session.speechProgress),
          } as any,
          session.callSid,
        )

        if (result.approved && result.next_instructions) {
          await session.updateInstructions(result.next_instructions)
        }

        return result.approved
          ? `{"gate":"ok","next":"${result.next_stage}"}`
          : `{"gate":"blocked","reason":"${result.reason}"}`
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
      name: 'registrar_parte_speech',
      description:
        'Registra que uma parte do Speech foi concluída. SOMENTE chame depois de entregar completamente a parte. O backend libera a próxima instrução após o turno real da lead. NUNCA chame partes fora de ordem.',
      parameters: z.object({
        parte: z.union([
          z.literal(1), z.literal(2), z.literal(3), z.literal(4),
          z.literal('pergunta_feita'), z.literal('resposta_recebida'),
        ]).describe('Qual parte ou marco foi concluído'),
      }),
      execute: async ({ parte }: { parte: number | string }) => {
        const sp = session.speechProgress

        // Validate ordering
        if (typeof parte === 'number') {
          if (parte !== sp.parte_atual) {
            return `{"error":"Ordem incorreta. parte_atual=${sp.parte_atual}, tentou registrar parte=${parte}. Não pule partes."}`
          }
          if (sp.parte_interrompida) {
            return `{"error":"Parte ${parte} foi interrompida — conclua o conteúdo restante antes de registrar."}`
          }
          sp.partes_entregues.push(parte as any)
          sp.parte_em_execucao = undefined
          sp.parte_interrompida = false
          sp.parte_atual = (parte < 4 ? parte + 1 : 'final_question') as any
          sp.state = 'WAITING_LEAD'
          sp.waiting_for_lead = true
          await saveSpeechProgress(session.callSid, sp as any)
          return `{"ok":true,"parte_registrada":${parte},"aguardando":"turno_da_lead","instrucao":"ENCERRE SEU TURNO AGORA. NÃO adicione perguntas, NÃO peça feedback, NÃO diga 'faz sentido?', NÃO diga 'está acompanhando?', NÃO diga 'pode continuar?'. Sua última frase já foi a última frase. A lead falará quando quiser. O backend liberará a próxima parte após o turno dela."}`
        }

        if (parte === 'pergunta_feita') {
          sp.pergunta_final_feita = true
          sp.state = 'WAITING_FINAL_RESPONSE'
          sp.waiting_for_lead = true
          await saveSpeechProgress(session.callSid, sp as any)
          return `{"ok":true,"pergunta_final":"registrada","aguardando":"resposta_final_da_lead","instrucao":"PARE. Aguarde a resposta real da lead à pergunta final."}`
        }

        if (parte === 'resposta_recebida') {
          sp.resposta_final_recebida = true
          sp.parte_atual = 'complete'
          sp.state = 'COMPLETE'
          sp.waiting_for_lead = false
          await saveSpeechProgress(session.callSid, sp as any)
          await session.updateInstructions(getPartInstruction('complete'))
          return `{"ok":true,"speech_progress":"COMPLETE","instrucao":"Pode chamar gateValidator GATE_SPEECH agora com todas as evidências."}`
        }

        return `{"error":"parte inválida: ${parte}"}`
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
