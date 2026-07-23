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
  const count = Number(req.nextUrl.searchParams.get('count') || '200')

  if (!phone) return NextResponse.json({ ok: false, error: 'phone required' }, { status: 400 })

  // Normalize: strip non-digits
  const normalized = phone.replace(/\D/g, '')

  // Handle Brazilian 9-digit mobile prefix: try both formats
  // 55 + 48 + 9 + 8 digits (13) ↔ 55 + 48 + 8 digits (12)
  let alt: string | null = null
  if (normalized.length === 13 && normalized.startsWith('55')) {
    alt = normalized.slice(0, 4) + normalized.slice(5) // remove the 9
  } else if (normalized.length === 12 && normalized.startsWith('55')) {
    alt = normalized.slice(0, 4) + '9' + normalized.slice(4) // add the 9
  }

  const filter = alt
    ? `phone.eq.${normalized},phone.eq.${alt}`
    : `phone.eq.${normalized}`

  const { data, error } = await supabase
    .from('mensagens_whatsapp')
    .select('role, content, type, ts')
    .or(filter)
    .order('ts', { ascending: true })
    .limit(count)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, messages: data || [] })
}
