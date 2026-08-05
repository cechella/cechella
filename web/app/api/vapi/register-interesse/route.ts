import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const N8N_VAPI = 'https://n8n.hormoneecosystem.com/webhook/vapi-ana'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    let telefone: string | undefined
    let metodo: string | undefined
    let temperatura: string | undefined
    let callId: string | undefined

    if (body.message?.type === 'tool-calls') {
      const tool = body.message.toolCallList?.find((t: any) => t.function?.name === 'register_interesse')
      if (tool) {
        const params = JSON.parse(tool.function?.arguments || '{}')
        metodo = params.metodo
        temperatura = params.temperatura
      }
      telefone = body.message.call?.customer?.number || body.message.call?.phoneNumber?.number
      callId = body.message.call?.id
    } else if (body.message?.type === 'function-call') {
      const params = body.message.functionCall?.parameters || {}
      metodo = params.metodo
      temperatura = params.temperatura
      telefone = body.message.call?.customer?.number || body.message.call?.phoneNumber?.number
      callId = body.message.call?.id
    } else {
      telefone = body.telefone
      metodo = body.metodo
      temperatura = body.temperatura
      callId = body.call_id ?? body.callId
    }

    // If telefone is empty (VAPI apiRequest doesn't inject call context),
    // fall back to most recent active call in historico_voz
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

    if (!telefone || String(telefone).replace(/\D/g, '').length < 8) {
      return NextResponse.json({ result: 'Erro: telefone não encontrado.' })
    }

    const digits = String(telefone).replace(/\D/g, '')
    const telefoneNorm = digits.startsWith('55') ? digits : `55${digits}`

    // Update lead temperatura in Supabase
    await supabase
      .from('leads')
      .update({ temperatura: temperatura || 'quente', updated_at: new Date().toISOString() })
      .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)

    // Call n8n to generate payment and send via WhatsApp
    await fetch(N8N_VAPI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gerar_pagamento: true,
        telefone_pagamento: telefoneNorm,
        metodo_pagamento: metodo || 'pix',
        call_id: callId || '',
      }),
    })

    const metodoLabel = metodo === 'cartao' ? 'link de pagamento' : 'código PIX'
    return NextResponse.json({
      result: `Interesse registrado. ${metodoLabel} enviado no WhatsApp do lead.`,
    })
  } catch (err: any) {
    console.error('register-interesse error:', err)
    return NextResponse.json({ result: 'Erro ao registrar interesse.' })
  }
}
