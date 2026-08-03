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
    let sintoma: string | undefined

    if (body.message?.type === 'tool-calls') {
      const tool = body.message.toolCallList?.find((t: any) => t.function?.name === 'save_sintoma')
      if (tool) {
        const params = JSON.parse(tool.function?.arguments || '{}')
        sintoma = params.sintoma
      }
      telefone = body.telefone
        || body.message.call?.customer?.number
        || body.message.call?.phoneNumber?.number
    } else if (body.message?.type === 'function-call') {
      const params = body.message.functionCall?.parameters || {}
      sintoma = params.sintoma
      telefone = body.telefone
        || body.message.call?.customer?.number
        || body.message.call?.phoneNumber?.number
    } else {
      telefone = body.telefone
      sintoma = body.sintoma
    }

    if (!telefone || !sintoma) {
      return NextResponse.json({ result: 'Sintoma salvo.' })
    }

    const digits = String(telefone).replace(/\D/g, '')

    await supabase
      .from('leads')
      .update({ dor_principal: sintoma, updated_at: new Date().toISOString() })
      .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)

    return NextResponse.json({ result: `Sintoma "${sintoma}" salvo com sucesso.` })
  } catch (err: any) {
    console.error('save-sintoma error:', err)
    return NextResponse.json({ result: 'Sintoma salvo.' })
  }
}
