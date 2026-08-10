import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ETAPAS_VALIDAS = ['apresentacao', 'conexao', 'di', 'speech', 'fechamento', 'referidos', 'validacao', 'ganho', 'perdido']
const ETAPA_NUM: Record<string, number> = {
  apresentacao: 1, conexao: 2, di: 3, speech: 4,
  fechamento: 5, referidos: 6, validacao: 7, ganho: 8, perdido: 9,
}

function vapiResponse(result: string, toolCallId?: string) {
  if (toolCallId) {
    return NextResponse.json({ results: [{ toolCallId, result }] })
  }
  return NextResponse.json({ result })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    let telefone: string | undefined
    let etapa: string | number | undefined
    let callId: string | undefined
    let toolCallId: string | undefined

    if (body.message?.type === 'function-call') {
      const params = body.message.functionCall?.parameters || {}
      telefone = params.telefone
      etapa = params.etapa ?? params.nova_etapa
      callId = body.message.call?.id
    } else if (body.message?.type === 'tool-calls') {
      const tool = body.message.toolCallList?.find((t: any) => t.function?.name === 'update_etapa')
      if (tool) {
        toolCallId = tool.id
        const params = typeof tool.function?.arguments === 'string'
          ? JSON.parse(tool.function.arguments)
          : (tool.function?.arguments || {})
        telefone = params.telefone
        etapa = params.etapa ?? params.nova_etapa
      }
      if (!telefone || String(telefone).replace(/\D/g, '').length < 8) {
        telefone = body.message.call?.customer?.number
          || body.message.call?.phoneNumber?.number
          || body.message.call?.customer?.numberE164
          || body.telefone
          || body.message.call?.to
          || body.message.call?.from
      }
      callId = body.message.call?.id
    } else {
      telefone = body.telefone
      etapa = body.etapa ?? body.nova_etapa
      callId = body.call_id ?? body.callId
      if (etapa === undefined && body.message?.toolCallList?.length) {
        const tool = body.message.toolCallList[0]
        toolCallId = tool.id
        const args = typeof tool.function?.arguments === 'string'
          ? JSON.parse(tool.function.arguments)
          : (tool.function?.arguments || {})
        if (!telefone) telefone = args.telefone
        if (etapa === undefined) etapa = args.etapa ?? args.nova_etapa
        if (!callId) callId = args.callId
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
        .select('telefone, call_id')
        .is('duracao_segundos', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (activeCall?.telefone) {
        telefone = activeCall.telefone
        if (!callId) callId = activeCall.call_id
      }
    }

    if (!telefone || etapa === undefined) {
      return vapiResponse('Parâmetros insuficientes — etapa não atualizada.', toolCallId)
    }

    const digits = String(telefone).replace(/\D/g, '')

    let etapaNum: number
    let etapaStr: string
    if (typeof etapa === 'number' || /^\d+$/.test(String(etapa))) {
      etapaNum = Number(etapa)
      etapaStr = Object.entries(ETAPA_NUM).find(([, v]) => v === etapaNum)?.[0] || String(etapa)
    } else {
      const key = String(etapa).toLowerCase().replace(/[^a-z]/g, '')
      etapaStr = ETAPAS_VALIDAS.find(e => e.startsWith(key)) || 'apresentacao'
      etapaNum = ETAPA_NUM[etapaStr] || 1
    }

    const { data: leads } = await supabase
      .from('leads')
      .select('id, etapa_agente, nome, telefone')
      .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)
      .limit(1)

    const lead = leads?.[0]

    if (!lead) {
      const { data: newLead } = await supabase
        .from('leads')
        .insert({
          telefone: digits.startsWith('55') ? digits : `55${digits}`,
          etapa: 'apresentacao',
          etapa_agente: etapaNum,
          origem: 'vapi_voz',
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (callId && newLead) {
        await supabase.from('historico_voz').update({ etapa_fim: etapaNum })
          .eq('call_id', callId)
      }

      return vapiResponse(`Lead criado e etapa definida: ${etapaStr} (${etapaNum})`, toolCallId)
    }

    const etapaAtual = Number(lead.etapa_agente) || 1

    if (etapaNum <= etapaAtual && etapaStr !== 'perdido') {
      return vapiResponse(`Etapa mantida em ${etapaAtual} (sem regressão)`, toolCallId)
    }

    await supabase
      .from('leads')
      .update({
        etapa_agente: etapaNum,
        etapa: etapaStr,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id)

    if (callId) {
      await supabase.from('historico_voz')
        .update({ etapa_fim: etapaNum })
        .eq('call_id', callId)
    }

    return vapiResponse(`Etapa atualizada: ${etapaStr} (${etapaNum}) para ${lead.nome || digits}`, toolCallId)
  } catch (err: any) {
    console.error('update-etapa error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
