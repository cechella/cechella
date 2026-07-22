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

  const { data, error } = await supabase
    .from('mensagens_whatsapp')
    .select('role, content, type, ts')
    .eq('phone', normalized)
    .order('ts', { ascending: true })
    .limit(count)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, messages: data || [] })
}
