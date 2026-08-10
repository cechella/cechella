import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET /api/admin/ana-master/events?conversation_id=<uuid>&type=call_dropped&limit=50
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const conversation_id = searchParams.get('conversation_id')
  const type = searchParams.get('type')
  const limit = parseInt(searchParams.get('limit') || '200')

  let q = supabase
    .from('ana_conversation_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (conversation_id) q = q.eq('conversation_id', conversation_id)
  if (type) q = q.eq('type', type)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/admin/ana-master/events  body: { conversation_id, call_id?, type, payload?, stage_at_event? }
// Append-only — no PATCH or DELETE
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { conversation_id, type } = body
  if (!conversation_id || !type) {
    return NextResponse.json({ error: 'conversation_id and type required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('ana_conversation_events')
    .insert({ ...body, created_at: new Date().toISOString() })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
