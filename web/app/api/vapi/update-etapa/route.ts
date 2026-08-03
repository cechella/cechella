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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // VAPI wraps function call results in message.toolCallList or message.functionCall
    // Handle both VAPI server-url format and direct calls
    let telefone: string | undefined
    let etapa: string | number | undefined
    let callId: string | undefined

    if (body.message?.type === 'function-call') {
      const params = body.message.functionCall?.parameters || {}
      telefone = params.telefone
      etapa = params.etapa ?? params.nova_etapa
      callId = body.message.call?.id
    } else if (body.message?.type === 'tool-calls') {
      const tool = body.message.toolCallList?.find((t: any) => t.function?.name === 'update_etapa')
      if (tool) {
        const params = JSON.parse(tool.function?.arguments || '{}')
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
      // Direct call from VAPI server-url or admin
      telefone = body.telefone
      etapa = body.etapa ?? body.nova_etapa
      callId = body.call_id ?? body.callId
    }

    if (!telefone || etapa === undefined) {
      return NextResponse.json({ error: 'telefone e etapa são obrigatórios' }, { status: 400 })
    }

    const digits = String(telefone).replace(/\D/g, '')

    // Resolve etapa: accept number (1-9) or string name
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

    // Find lead by phone (try with and without country code)
    const { data: leads } = await supabase
      .from('leads')
      .select('id, etapa_agente, nome, telefone')
      .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)
      .limit(1)

    const lead = leads?.[0]

    if (!lead) {
      // Create minimal lead entry so voice lead appears in pipeline
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

      return NextResponse.json({ result: `Lead criado e etapa definida: ${etapaStr} (${etapaNum})` })
    }

    const etapaAtual = Number(lead.etapa_agente) || 1

    // Only advance, never regress (same rule as WhatsApp Ana)
    if (etapaNum <= etapaAtual && etapaStr !== 'perdido') {
      return NextResponse.json({ result: `Etapa mantida em ${etapaAtual} (sem regressão)` })
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

    return NextResponse.json({
      result: `Etapa atualizada: ${etapaStr} (${etapaNum}) para ${lead.nome || digits}`,
    })
  } catch (err: any) {
    console.error('update-etapa error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
