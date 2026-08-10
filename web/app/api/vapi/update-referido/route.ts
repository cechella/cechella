import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    let telefone_lead: string | undefined
    let nome_referido: string | undefined
    let profissao: string | undefined
    let hobby: string | undefined

    if (body.message?.type === 'tool-calls') {
      const tool = body.message.toolCallList?.find((t: any) => t.function?.name === 'update_referido')
      if (tool) {
        const params = typeof tool.function?.arguments === 'string'
          ? JSON.parse(tool.function.arguments)
          : (tool.function?.arguments || {})
        nome_referido = params.nome_referido
        profissao = params.profissao
        hobby = params.hobby
      }
      telefone_lead = body.message.call?.customer?.number
        || body.message.call?.phoneNumber?.number
        || body.message.call?.customer?.numberE164
    } else if (body.message?.type === 'function-call') {
      const params = body.message.functionCall?.parameters || {}
      nome_referido = params.nome_referido
      profissao = params.profissao
      hobby = params.hobby
      telefone_lead = body.message.call?.customer?.number
        || body.message.call?.phoneNumber?.number
    } else {
      nome_referido = body.nome_referido
      profissao = body.profissao
      hobby = body.hobby
      telefone_lead = body.telefone_lead || body.telefone
    }

    // Fallback: telefone via historico_voz
    if (!telefone_lead || String(telefone_lead).replace(/\D/g, '').length < 8) {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data: activeCall } = await supabase
        .from('historico_voz')
        .select('telefone')
        .is('duracao_segundos', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (activeCall?.telefone) telefone_lead = activeCall.telefone
    }

    if (!telefone_lead || !nome_referido || !profissao || !hobby) {
      return NextResponse.json({ error: 'telefone_lead, nome_referido, profissao e hobby são obrigatórios' }, { status: 400 })
    }

    const digits = String(telefone_lead).replace(/\D/g, '')
    const telefoneNorm = digits.startsWith('55') ? digits : `55${digits}`

    // Busca o referido pelo nome (case-insensitive) e telefone do lead
    const { data: referidos } = await supabase
      .from('contatos_referidos')
      .select('id, nome')
      .or(`indicado_por_telefone.eq.${digits},indicado_por_telefone.eq.${telefoneNorm},indicado_por_telefone.eq.${digits.replace(/^55/, '')}`)

    if (!referidos?.length) {
      return NextResponse.json({ error: 'Nenhum referido encontrado para este lead' }, { status: 404 })
    }

    const nomeBusca = String(nome_referido).toLowerCase().trim()
    const match = referidos.find(r =>
      String(r.nome).toLowerCase().trim().includes(nomeBusca) ||
      nomeBusca.includes(String(r.nome).toLowerCase().trim())
    )

    if (!match) {
      return NextResponse.json({ error: `Referido "${nome_referido}" não encontrado` }, { status: 404 })
    }

    await supabase
      .from('contatos_referidos')
      .update({ profissao, hobby, prioridade: 1 })
      .eq('id', match.id)

    return NextResponse.json({
      result: `Dados atualizados: ${match.nome} — profissão: ${profissao}, hobby: ${hobby}`,
    })
  } catch (err: any) {
    console.error('update-referido error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
