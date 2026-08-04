import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function gerarToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  try {
    const { leadId } = await req.json()
    if (!leadId) return NextResponse.json({ error: 'leadId obrigatório' }, { status: 400 })

    const { data: lead } = await supabase
      .from('leads')
      .select('id, nome, token_indicacao')
      .eq('id', leadId)
      .single()

    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

    // Reutiliza token existente ou gera novo
    let token = lead.token_indicacao
    if (!token) {
      token = gerarToken()
      await supabase.from('leads').update({ token_indicacao: token }).eq('id', leadId)
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hormoneecosystem.com'
    return NextResponse.json({ token, url: `${baseUrl}/indicar/${token}`, nome: lead.nome })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
