import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest) {
  try {
    const callSid = req.nextUrl.searchParams.get('callSid')
    const telefone = req.nextUrl.searchParams.get('telefone')

    let phone = ''

    if (callSid) {
      const { data } = await supabase.from('ana_calls').select('telefone').eq('call_sid', callSid).maybeSingle()
      phone = String(data?.telefone || '').replace(/\D/g, '')
    }
    if (!phone && telefone) {
      phone = String(telefone).replace(/\D/g, '')
    }
    if (!phone) {
      return NextResponse.json({ error: 'callSid ou telefone obrigatório' }, { status: 400 })
    }

    const { data } = await supabase
      .from('contatos_referidos')
      .select('id, profissao, hobby, status')
      .or(`indicado_por_telefone.eq.${phone},indicado_por_telefone.eq.55${phone},indicado_por_telefone.eq.${phone.replace(/^55/, '')}`)

    if (!data || data.length === 0) {
      return NextResponse.json({ completo: false, semDados: 20, missaoCompleta: false, total: 0 })
    }

    const ativos = data.filter((r: any) => r.status !== 'recusou')
    const semDados = ativos.filter((r: any) => !r.profissao || !r.hobby).length
    const completo = ativos.length >= 20

    return NextResponse.json({
      completo,
      semDados,
      missaoCompleta: completo && semDados === 0,
      total: ativos.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
