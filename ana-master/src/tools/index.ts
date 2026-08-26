import { z } from 'zod'
import { getMemories, saveMemory, checkReferidos } from '../supabase.js'
import { iniciarColetaReferidos } from './whatsapp.js'

export type SessionRef = {
  callSid: string
  telefone: string
}

export function buildTools(session: SessionRef) {
  return [
    {
      name: 'solicitar_pagamento',
      description:
        'Chame assim que a lead confirmar a forma de pagamento (PIX ou cartão). O sistema envia o link de pagamento automaticamente no WhatsApp da lead. Após chamar esta ferramenta, diga à lead que o link acabou de chegar no WhatsApp dela. A confirmação do pagamento chegará automaticamente — continue a conversa natural enquanto aguarda. NUNCA confirme pagamento antes de receber confirmação do sistema.',
      parameters: z.object({
        metodo: z.enum(['pix', 'cartao']).describe('Forma de pagamento escolhida pela lead'),
      }),
      execute: async ({ metodo }: { metodo: 'pix' | 'cartao' }) => {
        try {
          const { APP_URL } = await import('../config.js')
          console.log(`[PAG] enviando link callSid=${session.callSid} telefone=${session.telefone} metodo=${metodo}`)
          const res = await fetch(`${APP_URL}/api/admin/ana-master/simulador/pix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callSid: session.callSid, telefone: session.telefone, metodo }),
          })
          console.log(`[PAG] link enviado status=${res.status}`)
          await saveMemory(session.callSid, 'forma_pagamento_escolhida', metodo).catch(() => {})
          return `{"ok":true,"enviado":true,"metodo":"${metodo}"}`
        } catch (e: any) {
          console.error(`[PAG] erro ao enviar link: ${e.message}`)
          return `{"ok":false,"motivo":"${e.message}"}`
        }
      },
    },

    {
      name: 'iniciar_coleta_referidos',
      description:
        'Envia o link de indicações no WhatsApp da lead. Chame somente após o pagamento ter sido confirmado. O link é o ÚNICO canal para coletar referidos — nunca colete contatos por voz.',
      parameters: z.object({}),
      execute: async () => {
        const result = await iniciarColetaReferidos(session.telefone)
        if (!result) {
          return 'Pagamento não confirmado — não é possível enviar o link ainda.'
        }
        await saveMemory(session.callSid, 'token_indicacao', result.token).catch(() => {})
        console.log(`[REFERIDOS] link enviado token=${result.token}`)
        return `{"ok":true,"link_enviado":true,"token":"${result.token}"}`
      },
    },

    {
      name: 'verificar_referidos',
      description:
        'Verifica o progresso das indicações. Chame silenciosamente a cada 2 minutos após enviar o link. Retorna: total (quantas indicadas), semDados (sem profissão/hobby), missaoCompleta (true quando total≥20 e semDados=0).',
      parameters: z.object({}),
      execute: async () => {
        const memories = await getMemories(session.callSid)
        const token = memories.token_indicacao as string | undefined
        if (!token) return '{"erro":"token_nao_encontrado","mensagem":"O link foi enviado? Chame iniciar_coleta_referidos primeiro."}'
        const ref = await checkReferidos(token)
        console.log(`[REFERIDOS] verificar token=${token} completo=${ref.completo} semDados=${ref.semDados} missaoCompleta=${ref.missaoCompleta}`)
        return JSON.stringify(ref)
      },
    },
  ]
}
