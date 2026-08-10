import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET /api/admin/ana-master/conversations?id=<uuid>  → single conversation + facts + calls
// GET /api/admin/ana-master/conversations?status=ativa&limit=50  → list
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '100')

  if (id) {
    const [conv, facts, calls, recovery] = await Promise.all([
      supabase.from('ana_conversations').select('*').eq('id', id).single(),
      supabase.from('ana_conversation_facts').select('*').eq('conversation_id', id).order('created_at'),
      supabase.from('ana_calls').select('*').eq('conversation_id', id).order('attempt_number'),
      supabase.from('ana_recovery_attempts').select('*').eq('conversation_id', id).order('attempt_no', { ascending: false }).limit(10),
    ])
    if (conv.error) return NextResponse.json({ error: conv.error.message }, { status: 500 })
    return NextResponse.json({ data: { ...conv.data, facts: facts.data, calls: calls.data, recovery: recovery.data } })
  }

  let q = supabase.from('ana_conversations').select('*').order('created_at', { ascending: false }).limit(limit)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/admin/ana-master/conversations  body: { conversation?, fact?, call? }
export async function POST(req: NextRequest) {
  const body = await req.json()

  // Create conversation
  if (body.conversation) {
    const { data, error } = await supabase
      .from('ana_conversations')
      .insert({ ...body.conversation, created_at: new Date().toISOString() })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // Upsert a fact (idempotent by conversation_id + key)
  if (body.fact) {
    const { conversation_id, key, value, ...rest } = body.fact
    const { data, error } = await supabase
      .from('ana_conversation_facts')
      .upsert({ conversation_id, key, value, ...rest, updated_at: new Date().toISOString() },
               { onConflict: 'conversation_id,key' })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // Register a call segment
  if (body.call) {
    const { data, error } = await supabase
      .from('ana_calls')
      .insert({ ...body.call, created_at: new Date().toISOString() })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'body must contain conversation, fact, or call' }, { status: 400 })
}

// PATCH /api/admin/ana-master/conversations  body: { id, updates }
export async function PATCH(req: NextRequest) {
  const { id, updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('ana_conversations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// DELETE /api/admin/ana-master/conversations?id=<uuid>
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase.from('ana_conversations').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
