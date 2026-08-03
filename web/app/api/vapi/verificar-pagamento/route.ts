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

    let telefone: string | undefined

    if (body.message?.type === 'tool-calls') {
      const tool = body.message.toolCallList?.find((t: any) => t.function?.name === 'verificar_pagamento')
      telefone = body.message.call?.customer?.number || body.message.call?.phoneNumber?.number
    } else if (body.message?.type === 'function-call') {
      telefone = body.message.call?.customer?.number || body.message.call?.phoneNumber?.number
    } else {
      telefone = body.telefone
    }

    if (!telefone) {
      return NextResponse.json({ result: 'Telefone não encontrado.' })
    }

    const digits = String(telefone).replace(/\D/g, '')

    const { data: lead } = await supabase
      .from('leads')
      .select('pagamento_confirmado, pagamento_gerado, metodo_pagamento')
      .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)
      .maybeSingle()

    if (!lead) {
      return NextResponse.json({ result: 'Lead não encontrado.' })
    }

    if (lead.pagamento_confirmado) {
      return NextResponse.json({
        result: 'Pagamento confirmado! O sistema registrou o pagamento com sucesso.',
        confirmado: true,
      })
    }

    if (lead.pagamento_gerado) {
      return NextResponse.json({
        result: 'Pagamento ainda não confirmado. O código já foi enviado no WhatsApp. Aguarde alguns instantes.',
        confirmado: false,
        gerado: true,
      })
    }

    return NextResponse.json({
      result: 'Pagamento ainda não gerado.',
      confirmado: false,
      gerado: false,
    })
  } catch (err: any) {
    console.error('verificar-pagamento error:', err)
    return NextResponse.json({ result: 'Erro ao verificar pagamento.' })
  }
}
