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

    // Handle call-start: create lead if not exists
    if (type === 'call-start' || type === 'call.started') {
      if (telefone && telefone.length >= 10) {
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .or(`telefone.eq.${telefone},telefone.eq.55${telefone},telefone.eq.${telefone.replace(/^55/, '')}`)
          .limit(1)

        if (existing && existing.length > 0) {
          await supabase.from('leads').update({ em_ligacao: true, updated_at: new Date().toISOString() }).eq('id', existing[0].id)
        } else {
          const tel = telefone.startsWith('55') ? telefone : `55${telefone}`
          await supabase.from('leads').insert({
            telefone: tel,
            em_ligacao: true,
            etapa_agente: 1,
            origem: 'vapi_voz',
            updated_at: new Date().toISOString(),
          })
        }
      }
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
