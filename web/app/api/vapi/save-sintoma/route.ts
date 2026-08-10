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
    const muteLog = initMuteLog(body, 'save_sintoma')
    await muteBeforeTool(muteLog)

    let telefone: string | undefined
    let sintoma: string | undefined
    let callId: string | undefined
    let toolCallId: string | undefined

    if (body.message?.type === 'tool-calls') {
      const tool = body.message.toolCallList?.find((t: any) => t.function?.name === 'save_sintoma')
      if (tool) {
        toolCallId = tool.id
        const params = typeof tool.function?.arguments === 'string'
          ? JSON.parse(tool.function.arguments)
          : (tool.function?.arguments || {})
        sintoma = params.sintoma
      }
      telefone = body.message.call?.customer?.number
        || body.message.call?.customer?.numberE164
        || body.message.call?.phoneNumber?.number
        || body.message.call?.to
        || body.telefone
      callId = body.message.call?.id
    } else if (body.message?.type === 'function-call') {
      const params = body.message.functionCall?.parameters || {}
      sintoma = params.sintoma
      telefone = body.message.call?.customer?.number
        || body.message.call?.phoneNumber?.number
        || body.telefone
      callId = body.message.call?.id
    } else {
      telefone = body.telefone
      sintoma = body.sintoma
      callId = body.call_id ?? body.callId
      if (!sintoma && body.message?.toolCallList?.length) {
        const tool = body.message.toolCallList[0]
        toolCallId = tool.id
        const args = typeof tool.function?.arguments === 'string'
          ? JSON.parse(tool.function.arguments)
          : (tool.function?.arguments || {})
        if (!sintoma) sintoma = args.sintoma
        if (!telefone) telefone = args.telefone
      }
    }

    // Fallback 1: busca por callId
    if ((!telefone || String(telefone).replace(/\D/g, '').length < 8) && callId) {
      const { data: byCall } = await supabase
        .from('historico_voz')
        .select('telefone')
        .eq('call_id', callId)
        .maybeSingle()
      if (byCall?.telefone) telefone = byCall.telefone
    }

    // Fallback 2: ligação ativa mais recente
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

    if (!sintoma) {
      markToolDone(muteLog)
      await unmuteAfterTool(muteLog)
      return vapiResponse('Sintoma não informado.', toolCallId)
    }

    if (!telefone || String(telefone).replace(/\D/g, '').length < 8) {
      markToolDone(muteLog)
      await unmuteAfterTool(muteLog)
      return vapiResponse(`Sintoma "${sintoma}" registrado (lead não encontrado).`, toolCallId)
    }

    const digits = String(telefone).replace(/\D/g, '')

    await supabase
      .from('leads')
      .update({ dor_principal: sintoma, updated_at: new Date().toISOString() })
      .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)

    markToolDone(muteLog)
    await unmuteAfterTool(muteLog)
    return vapiResponse(`Sintoma "${sintoma}" salvo com sucesso.`, toolCallId)
  } catch (err: any) {
    console.error('save-sintoma error:', err)
    return NextResponse.json({ result: 'Sintoma salvo.' })
  }
}
