import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GOLD_DEFAULTS, CONTROLLER_DEFAULTS } from '@/lib/ana-master/realtime-config-defaults'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest) {
  const profile = req.nextUrl.searchParams.get('profile') ?? 'gold'
  const defaults = profile === 'gold' ? GOLD_DEFAULTS : CONTROLLER_DEFAULTS

  try {
    const { data, error } = await supabase
      .from('ana_realtime_profiles')
      .select('*')
      .eq('profile', profile)
      .single()

    if (error || !data) {
      return NextResponse.json({ ...defaults, _source: 'defaults' })
    }

    return NextResponse.json({ ...data, _source: 'db' })
  } catch {
    return NextResponse.json({ ...defaults, _source: 'defaults' })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { profile } = body

    if (!profile || !['gold', 'controller'].includes(profile)) {
      return NextResponse.json({ error: 'profile inválido' }, { status: 400 })
    }

    const record = {
      ...body,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('ana_realtime_profiles')
      .upsert(record, { onConflict: 'profile' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
