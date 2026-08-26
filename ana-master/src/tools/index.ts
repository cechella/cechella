import { z } from 'zod'
import { supabase, getMemories, saveMemory, checkReferidos, updateLeadsGanho } from '../supabase.js'
import { iniciarColetaReferidos, sendWelcome } from './whatsapp.js'

export type SessionRef = {
  callSid: string
  telefone: string
  metodoEscolhido?: 'pix' | 'cartao'
}

export function buildTools(session: SessionRef) {
  return [
    {
      name: 'solicitar_pagamento',
      description:
        'Chame assim que a lead confirmar a forma de pagamento (PIX ou cartão). O sistema envia o link de pagamento no WhatsApp e aguarda confirmação. Quando retornar paid:true, o pagamento foi confirmado — celebre naturalmente e avance para referidos. NUNCA confirme pagamento sem receber paid:true desta ferramenta.',
      parameters: z.object({
        metodo: z.enum(['pix', 'cartao']).describe('Forma de pagamento escolhida pela lead'),
      }),
      execute: async ({ metodo }: { metodo: 'pix' | 'cartao' }) => {
        try {
          const { APP_URL } = await import('../config.js')
          console.log(`[PAG] inicio callSid=${session.callSid} telefone=${session.telefone} metodo=${metodo}`)

          // Save chosen method so timeout fallback uses the correct one
          session.metodoEscolhido = metodo

          // Send PIX link (dedup-safe — auto-PIX may have already sent it)
          await fetch(`${APP_URL}/api/admin/ana-master/simulador/pix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callSid: session.callSid, telefone: session.telefone, metodo }),
          }).catch((e: Error) => console.log(`[PAG] send error (ok if already sent): ${e.message}`))

          await saveMemory(session.callSid, 'forma_pagamento_escolhida', metodo).catch(() => {})
          console.log(`[PAG] aguardando confirmação callSid=${session.callSid}`)

          // Wait for payment confirmation via Supabase Realtime (up to 5 min)
          const paid = await new Promise<boolean>((resolve) => {
            let settled = false
            const finish = (result: boolean) => {
              if (settled) return
              settled = true
              clearTimeout(timer)
              supabase.removeChannel(channel).catch(() => {})
              console.log(`[PAG] ${result ? '✅ confirmado' : '⏰ timeout'} callSid=${session.callSid}`)
              resolve(result)
            }

            const timer = setTimeout(() => finish(false), 5 * 60 * 1000)

            const channel = supabase
              .channel(`pag:${session.callSid}`)
              .on(
                'postgres_changes' as any,
                { event: 'UPDATE', schema: 'public', table: 'pagamentos', filter: `call_sid=eq.${session.callSid}` },
                (payload: any) => {
                  console.log(`[PAG] realtime status=${payload.new?.status}`)
                  if (payload.new?.status === 'approved') finish(true)
                },
              )
              .subscribe(async (status: string) => {
                console.log(`[PAG] realtime subscribe status=${status}`)
                if (status === 'SUBSCRIBED') {
                  const { data } = await supabase
                    .from('pagamentos').select('status')
                    .eq('call_sid', session.callSid).eq('status', 'approved').maybeSingle()
                  if (data) { console.log('[PAG] já aprovado no DB'); finish(true) }
                }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                  console.log(`[PAG] realtime falhou (${status}), fallback poll`)
                  const poll = setInterval(async () => {
                    if (settled) { clearInterval(poll); return }
                    const { data } = await supabase
                      .from('pagamentos').select('status')
                      .eq('call_sid', session.callSid).eq('status', 'approved').maybeSingle()
                    if (data) { clearInterval(poll); finish(true) }
                  }, 3000)
                }
              })
          })

          return paid
            ? `{"ok":true,"paid":true,"metodo":"${metodo}"}`
            : `{"ok":true,"paid":false,"metodo":"${metodo}","aguardando":true}`
        } catch (e: any) {
          console.error(`[PAG] erro: ${e.message}`)
          return `{"ok":true,"paid":false,"aguardando":true}`
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
        'Verifica o progresso das indicações. Chame silenciosamente a cada 2 minutos após enviar o link. Retorna: total (int — quantas indicadas), completo (bool — total≥20), semDados (int — sem profissão/hobby), missaoCompleta (bool — true quando completo=true e semDados=0).',
      parameters: z.object({}),
      execute: async () => {
        const memories = await getMemories(session.callSid)
        const token = memories.token_indicacao as string | undefined
        if (!token) return '{"erro":"token_nao_encontrado","mensagem":"O link foi enviado? Chame iniciar_coleta_referidos primeiro."}'
        const ref = await checkReferidos(token)
        console.log(`[REFERIDOS] verificar token=${token} total=${ref.total} completo=${ref.completo} semDados=${ref.semDados} missaoCompleta=${ref.missaoCompleta}`)
        if (ref.missaoCompleta) {
          console.log(`[REFERIDOS] 🏆 missão completa — marcando GANHO e enviando boas-vindas`)
          updateLeadsGanho(session.callSid).catch(() => {})
          if (session.telefone) sendWelcome(session.telefone).catch(() => {})
        }
        return JSON.stringify(ref)
      },
    },
  ]
}
