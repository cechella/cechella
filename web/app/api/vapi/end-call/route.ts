/**
 * VAPI Server URL Webhook — /api/vapi/end-call
 *
 * Esta rota é configurada no VAPI em: Assistant → Advanced → Webhook Server → Server URL
 * URL: https://www.hormoneecosystem.com/api/vapi/end-call
 *
 * Recebe TODOS os eventos do servidor VAPI (não apenas end-of-call):
 *
 * - call-start / call.started → cria lead no banco se não existir, marca em_ligacao: true
 * - end-of-call-report        → limpa em_ligacao: false, salva duração/resumo em historico_voz
 *
 * ATENÇÃO: Se o lead não aparecer no CRM/pipeline quando a ligação começa, verificar:
 * 1. No VAPI Advanced → Server URL aponta para esta rota? (não para o n8n)
 * 2. O evento call-start está chegando? (verificar Vercel logs)
 * 3. O telefone customer.number está preenchido no payload do VAPI?
 *
 * As ferramentas (get_lead_context, register_interesse, etc.) têm URLs próprias
 * configuradas em VAPI → Tools → cada tool → Request URL.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Called by VAPI server URL webhook (call-start, end-of-call-report, etc.)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const type = body.message?.type || body.type || ''
    const callId = body.message?.call?.id || body.call?.id || body.callId
    const rawPhone = body.message?.call?.customer?.number
      || body.call?.customer?.number
      || body.telefone
      || ''
    const telefone = String(rawPhone).replace(/\D/g, '')

    // Ensure lead exists in DB (called on every event that has phone)
    async function ensureLead(tel: string) {
      if (!tel || tel.length < 10) return
      const norm = tel.startsWith('55') ? tel : `55${tel}`
      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .or(`telefone.eq.${tel},telefone.eq.55${tel},telefone.eq.${tel.replace(/^55/, '')}`)
        .limit(1)
      if (existing && existing.length > 0) {
        await supabase.from('leads').update({ em_ligacao: true, updated_at: new Date().toISOString() }).eq('id', existing[0].id)
      } else {
        await supabase.from('leads').insert({
          telefone: norm,
          em_ligacao: true,
          etapa: 'apresentacao',
          etapa_agente: 1,
          origem: 'vapi_voz',
          updated_at: new Date().toISOString(),
        })
      }
    }

    // call-start / call.started / assistant-request / tool-calls → ensure lead exists
    if (
      type === 'call-start' || type === 'call.started' ||
      type === 'assistant-request' || type === 'tool-calls' ||
      type === 'function-call' || type === 'speech-update' ||
      type === 'transcript'
    ) {
      await ensureLead(telefone)
      // For tool-calls, forward to appropriate handler if needed; here just return ok
      return NextResponse.json({ ok: true })
    }
    const duracao = body.message?.durationSeconds
      || (body.call?.endedAt && body.call?.startedAt
        ? Math.round((new Date(body.call.endedAt).getTime() - new Date(body.call.startedAt).getTime()) / 1000)
        : null)
    const endedReason = body.message?.endedReason || body.call?.endedReason || null
    const resumo = body.message?.summary || body.summary || null

    if (telefone) {
      await supabase
        .from('leads')
        .update({ em_ligacao: false, updated_at: new Date().toISOString() })
        .or(`telefone.eq.${telefone},telefone.eq.55${telefone},telefone.eq.${telefone.replace(/^55/, '')}`)
    }

    if (callId) {
      await supabase
        .from('historico_voz')
        .update({
          duracao_segundos: duracao,
          ended_reason: endedReason,
          resumo,
        })
        .eq('call_id', callId)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('end-call error:', err)
    return NextResponse.json({ ok: true })
  }
}
