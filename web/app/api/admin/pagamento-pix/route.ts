import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) return NextResponse.json({ ok: false, error: 'phone required' }, { status: 400 })

  const normalized = phone.replace(/\D/g, '')
  // try both formats (with/without 9-digit prefix)
  let alt: string | null = null
  if (normalized.length === 13 && normalized.startsWith('55')) {
    alt = normalized.slice(0, 4) + normalized.slice(5)
  } else if (normalized.length === 12 && normalized.startsWith('55')) {
    alt = normalized.slice(0, 4) + '9' + normalized.slice(4)
  }

  const filter = alt
    ? `lead_telefone.eq.${normalized},lead_telefone.eq.${alt}`
    : `lead_telefone.eq.${normalized}`

  const { data, error } = await supabase
    .from('pagamentos')
    .select('pix_code, valor, status, expira_em, metodo, parcelas, created_at')
    .or(filter)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) return NextResponse.json({ ok: true, pagamento: null })

  return NextResponse.json({ ok: true, pagamento: data })
}
