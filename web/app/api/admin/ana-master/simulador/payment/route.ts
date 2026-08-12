import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest) {
  const telefone = req.nextUrl.searchParams.get('telefone')
  if (!telefone) return NextResponse.json({ pago: false, error: 'telefone obrigatório' }, { status: 400 })

  const digits = String(telefone).replace(/\D/g, '')
  const { data } = await supabase
    .from('leads')
    .select('status_pagamento')
    .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)
    .maybeSingle()

  return NextResponse.json({ pago: data?.status_pagamento === 'pago' })
}
