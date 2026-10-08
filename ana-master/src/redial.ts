import { supabase, saveMemory } from './supabase.js'

const MAX_RETRIES = 3
const RETRY_DELAYS_MS = [30_000, 120_000, 300_000]

export async function scheduleCallback(callSid: string): Promise<void> {
  try {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, PUBLIC_HOST } = process.env
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER || !PUBLIC_HOST) {
      console.log(`[REDIAL] env vars ausentes — skip callSid=${callSid}`)
      return
    }

    const { data: call } = await supabase
      .from('ana_calls')
      .select('telefone, status, memories')
      .eq('call_sid', callSid)
      .maybeSingle()

    if (!call?.telefone) {
      console.log(`[REDIAL] call não encontrada callSid=${callSid}`)
      return
    }

    if (call.status === 'ganho') {
      console.log(`[REDIAL] status=ganho — sem retorno necessário callSid=${callSid}`)
      return
    }

    // Check if lead is already marked ganho
    const telefone = String(call.telefone).replace(/\D/g, '')
    const bare = telefone.replace(/^55/, '')
    const { data: lead } = await supabase
      .from('leads')
      .select('etapa')
      .or(`telefone.eq.${telefone},telefone.eq.55${bare},telefone.eq.${bare}`)
      .maybeSingle()

    if (lead?.etapa === 'ganho') {
      console.log(`[REDIAL] lead.etapa=ganho — sem retorno necessário callSid=${callSid}`)
      return
    }

    const memories: Record<string, any> = call.memories ?? {}
    const tentativas = Number(memories.tentativas_retorno ?? 0)

    if (tentativas >= MAX_RETRIES) {
      console.log(`[REDIAL] max tentativas atingido (${tentativas}) callSid=${callSid}`)
      return
    }

    const delayMs = RETRY_DELAYS_MS[tentativas] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]
    console.log(`[REDIAL] agendando retorno tentativa=${tentativas + 1} delay=${delayMs}ms telefone=${call.telefone} callSid=${callSid}`)

    await saveMemory(callSid, 'tentativas_retorno', tentativas + 1).catch(() => {})

    setTimeout(async () => {
      try {
        // Re-check before actually calling — lead may have paid via another channel
        const { data: freshLead } = await supabase
          .from('leads')
          .select('etapa')
          .or(`telefone.eq.${telefone},telefone.eq.55${bare},telefone.eq.${bare}`)
          .maybeSingle()

        if (freshLead?.etapa === 'ganho') {
          console.log(`[REDIAL] lead.etapa=ganho ao disparar — cancelando retorno telefone=${call.telefone}`)
          return
        }

        const twimlUrl = `${PUBLIC_HOST.replace(/^https?:\/\//, 'https://')}/twiml?contexto=retomada&from=${call.telefone}`
        const body = new URLSearchParams({
          To: call.telefone.startsWith('+') ? call.telefone : `+${call.telefone}`,
          From: TWILIO_PHONE_NUMBER!,
          Url: twimlUrl,
          Method: 'POST',
        })

        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
            },
            body: body.toString(),
          },
        )

        if (response.ok) {
          const result: any = await response.json()
          console.log(`[REDIAL] ✅ retorno iniciado newCallSid=${result.sid} telefone=${call.telefone}`)
        } else {
          const err = await response.text()
          console.error(`[REDIAL] erro twilio status=${response.status}: ${err}`)
        }
      } catch (e: any) {
        console.error(`[REDIAL] erro ao ligar de volta: ${e.message}`)
      }
    }, delayMs)
  } catch (e: any) {
    console.error(`[REDIAL] scheduleCallback erro: ${e.message}`)
  }
}
