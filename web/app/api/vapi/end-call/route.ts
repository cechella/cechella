import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Called by VAPI end-of-call-report webhook
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const callId = body.call?.id || body.callId
    const telefone = body.call?.customer?.number || body.call?.phoneNumber?.number || body.telefone
    const duracao = body.call?.endedAt && body.call?.startedAt
      ? Math.round((new Date(body.call.endedAt).getTime() - new Date(body.call.startedAt).getTime()) / 1000)
      : body.durationSeconds || null
    const endedReason = body.call?.endedReason || body.endedReason || null
    const resumo = body.summary || body.call?.summary || null

    if (telefone) {
      const digits = String(telefone).replace(/\D/g, '')
      // Clear em_ligacao flag so Ana WhatsApp resumes
      await supabase
        .from('leads')
        .update({ em_ligacao: false, updated_at: new Date().toISOString() })
        .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)
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
