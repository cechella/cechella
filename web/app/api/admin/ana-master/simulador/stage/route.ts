import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function PATCH(req: NextRequest) {
  try {
    const { callSid, stage } = await req.json()
    if (!callSid || !stage) {
      return NextResponse.json({ error: 'callSid e stage obrigatórios' }, { status: 400 })
    }

    await supabase
      .from('ana_calls')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('call_sid', callSid)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
