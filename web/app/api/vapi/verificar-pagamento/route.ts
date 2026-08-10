import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { initMuteLog, muteBeforeTool, markToolDone, unmuteAfterTool } from '@/lib/vapi-control'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function vapiResponse(result: string, toolCallId?: string) {
  if (toolCallId) {
    return NextResponse.json({ results: [{ toolCallId, result }] })
  }
  return NextResponse.json({ result })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // SILENCE TEST — mute immediately on webhook arrival
    const muteLog = initMuteLog(body, 'verificar_pagamento')
    await muteBeforeTool(muteLog)

    let telefone: string | undefined
    let toolCallId: string | undefined

    if (body.message?.type === 'tool-calls') {
      const tool = body.message.toolCallList?.find((t: any) => t.function?.name === 'verificar_pagamento')
      if (tool) {
        toolCallId = tool.id
        const params = typeof tool.function?.arguments === 'string'
          ? JSON.parse(tool.function.arguments)
          : (tool.function?.arguments || {})
        telefone = params.telefone
      }
      if (!telefone || String(telefone).replace(/\D/g, '').length < 8) {
        telefone = body.message.call?.customer?.number
          || body.message.call?.customer?.numberE164
          || body.message.call?.phoneNumber?.number
          || body.message.call?.to
      }
    } else if (body.message?.type === 'function-call') {
      telefone = body.message.call?.customer?.number || body.message.call?.phoneNumber?.number
    } else {
      telefone = body.telefone
    }

    // Fallback: ligação ativa mais recente
    if (!telefone || String(telefone).replace(/\D/g, '').length < 8) {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data: activeCall } = await supabase
        .from('historico_voz')
        .select('telefone')
        .is('duracao_segundos', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (activeCall?.telefone) telefone = activeCall.telefone
    }

    if (!telefone || String(telefone).replace(/\D/g, '').length < 8) {
      markToolDone(muteLog)
      await unmuteAfterTool(muteLog)
      return vapiResponse('Telefone não encontrado.', toolCallId)
    }

    const digits = String(telefone).replace(/\D/g, '')

    const { data: lead } = await supabase
      .from('leads')
      .select('status_pagamento, metodo_pagamento')
      .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)
      .maybeSingle()

    if (!lead) {
      markToolDone(muteLog)
      await unmuteAfterTool(muteLog)
      return vapiResponse('Lead não encontrado.', toolCallId)
    }

    markToolDone(muteLog)
    await unmuteAfterTool(muteLog)

    if (lead.status_pagamento === 'pago') {
      return vapiResponse('Pagamento confirmado! O sistema registrou o pagamento com sucesso.', toolCallId)
    }

    return vapiResponse(
      'Pagamento ainda não confirmado. O código já foi enviado no WhatsApp. Aguarde alguns instantes e me avise quando aparecer a confirmação no seu banco.',
      toolCallId
    )
  } catch (err: any) {
    console.error('verificar-pagamento error:', err)
    return NextResponse.json({ result: 'Erro ao verificar pagamento.' })
  }
}
