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

  // Use last 8 digits as suffix to match any Brazilian phone format variation
  // (with/without 9-digit prefix, stored as 12 or 13 digits)
  const suffix = normalized.slice(-8)

  const { data, error } = await supabase
    .from('mensagens_whatsapp')
    .select('role, content, type, ts')
    .like('phone', `%${suffix}`)
    .order('ts', { ascending: true })
    .limit(count)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, messages: data || [] })
}
