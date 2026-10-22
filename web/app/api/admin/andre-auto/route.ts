import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'andre_auto')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.valor ?? { ativo: false })
}

export async function POST(req: NextRequest) {
  const { ativo } = await req.json()
  // Try update first, then insert if not found
  const { data: existing } = await supabase
    .from('configuracoes')
    .select('id')
    .eq('chave', 'andre_auto')
    .maybeSingle()

  let error
  if (existing?.id) {
    ;({ error } = await supabase
      .from('configuracoes')
      .update({ valor: { ativo: !!ativo } })
      .eq('chave', 'andre_auto'))
  } else {
    ;({ error } = await supabase
      .from('configuracoes')
      .insert({ chave: 'andre_auto', valor: { ativo: !!ativo } }))
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ativo: !!ativo })
}
