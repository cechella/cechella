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
    .from('ana_realtime_profiles')
    .select('instructions,voice,model')
    .eq('profile', 'andre')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? {})
}

export async function POST(req: NextRequest) {
  const { instructions } = await req.json()
  const { error } = await supabase
    .from('ana_realtime_profiles')
    .upsert({ profile: 'andre', instructions }, { onConflict: 'profile' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
