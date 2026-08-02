import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ETAPA_LABELS: Record<number, string> = {
  1: 'Apresentação', 2: 'Conexão', 3: 'D.I.', 4: 'Speech',
  5: 'Fechamento', 6: 'Referidos', 7: 'Validação', 8: 'Ganho',
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    let telefone: string | undefined

    if (body.message?.type === 'function-call') {
      telefone = body.message.functionCall?.parameters?.telefone
        || body.message.call?.customer?.number
        || body.message.call?.phoneNumber?.number
    } else if (body.message?.type === 'tool-calls') {
      const tool = body.message.toolCallList?.find((t: any) => t.function?.name === 'get_lead_context')
      if (tool) {
        const params = JSON.parse(tool.function?.arguments || '{}')
        telefone = params.telefone
      }
      // Fallback: pega o telefone do objeto da ligação
      if (!telefone) {
        telefone = body.message.call?.customer?.number
          || body.message.call?.phoneNumber?.number
      }
    } else {
      // Direct call or VAPI server-url format
      telefone = body.telefone
        || body.call?.customer?.number
        || body.call?.phoneNumber?.number
    }

    if (!telefone) {
      return NextResponse.json({ result: 'Telefone não informado. Trate como novo lead.' })
    }

    const digits = String(telefone).replace(/\D/g, '')

    const { data: leads } = await supabase
      .from('leads')
      .select('nome, etapa_agente, temperatura, dor_principal, origem')
      .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)
      .limit(1)

    const lead = leads?.[0]

    if (!lead) {
      return NextResponse.json({
        result: JSON.stringify({
          status: 'novo_lead',
          etapa: 1,
          etapa_label: 'Apresentação',
          instrucao: 'Novo lead. Inicie pela apresentação do Hormone Ecosystem.',
        }),
      })
    }

    const etapa = Number(lead.etapa_agente) || 1

    return NextResponse.json({
      result: JSON.stringify({
        nome: lead.nome || null,
        etapa,
        etapa_label: ETAPA_LABELS[etapa] || 'Apresentação',
        temperatura: lead.temperatura || 'frio',
        dor_principal: lead.dor_principal || null,
        origem: lead.origem || null,
        instrucao: etapa >= 3
          ? `Lead já está na etapa ${etapa} (${ETAPA_LABELS[etapa]}). Continue de onde parou, não repita apresentação.`
          : 'Inicie pelo rapport e apresentação do Hormone Ecosystem.',
      }),
    })
  } catch (err: any) {
    console.error('get-lead error:', err)
    return NextResponse.json({ result: 'Erro ao buscar lead. Trate como novo.' })
  }
}
