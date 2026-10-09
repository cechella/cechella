import { supabase, saveMemory } from './supabase.js'

const MAX_RETRIES = 1
const RETRY_DELAYS_MS = [30_000]

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

    // Count ALL previous calls for this phone number in the last 24h to prevent infinite loop
    // Each callback creates a new callSid — must count across calls, not per-call memories
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: prevCalls } = await supabase
      .from('ana_calls')
      .select('call_sid')
      .or(`telefone.eq.${telefone},telefone.eq.55${bare},telefone.eq.${bare}`)
      .gte('created_at', since24h)

    const tentativas = Math.max(0, (prevCalls?.length ?? 1) - 1) // subtract original call

    if (tentativas >= MAX_RETRIES) {
      console.log(`[REDIAL] max tentativas atingido (${tentativas}/${MAX_RETRIES}) telefone=${telefone} callSid=${callSid}`)
      return
    }

    const delayMs = RETRY_DELAYS_MS[tentativas] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]
    console.log(`[REDIAL] agendando retorno tentativa=${tentativas + 1}/${MAX_RETRIES} delay=${delayMs}ms telefone=${call.telefone} callSid=${callSid}`)

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

        const memories2: Record<string, any> = call.memories ?? {}
        const nomeLead = String(memories2.nome_lead ?? '').trim()
        const nomeParam = nomeLead ? `&nome=${encodeURIComponent(nomeLead)}` : ''
        const twimlUrl = `${PUBLIC_HOST.replace(/^https?:\/\//, 'https://')}/twiml?contexto=retomada&numero=${call.telefone}${nomeParam}`
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
