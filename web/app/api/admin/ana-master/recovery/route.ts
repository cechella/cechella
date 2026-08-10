import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET /api/admin/ana-master/recovery?conversation_id=<uuid>
// GET /api/admin/ana-master/recovery?status=agendada&limit=50
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const conversation_id = searchParams.get('conversation_id')
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '100')

  let q = supabase
    .from('ana_recovery_attempts')
    .select(`
      *,
      ana_conversations(lead_id, nome, stage, status)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (conversation_id) q = q.eq('conversation_id', conversation_id)
  if (status) q = q.eq('status', status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

// POST /api/admin/ana-master/recovery
// Creates a recovery attempt and optionally generates a resume_context from current conversation state
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { conversation_id } = body
  if (!conversation_id) return NextResponse.json({ error: 'conversation_id required' }, { status: 400 })

  // Load current conversation state to build resume_context
  const [convRes, factsRes] = await Promise.all([
    supabase.from('ana_conversations').select('*').eq('id', conversation_id).single(),
    supabase.from('ana_conversation_facts').select('*').eq('conversation_id', conversation_id),
  ])

  if (convRes.error) return NextResponse.json({ error: convRes.error.message }, { status: 500 })

  const conv = convRes.data
  const facts = factsRes.data || []

  // Build resume_context package (derived from DB, never invented)
  const resume_context = {
    lead: { id: conv.lead_id, nome: conv.nome, telefone: conv.telefone },
    origem: { source_type: conv.source_type, referrer_name: conv.referrer_name, referral_context: conv.referral_context },
    funil: { stage: conv.stage, substage: conv.substage, stage_status: conv.stage_status, completed_gates: conv.completed_gates, next_action: conv.next_action },
    fatos: facts.reduce((acc: Record<string, string>, f) => { acc[f.key] = f.value; return acc }, {}),
    checkpoint: conv.last_checkpoint,
    state_version: conv.state_version,
    generated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('ana_recovery_attempts')
    .insert({
      conversation_id,
      call_id: body.call_id || null,
      attempt_no: (conv.recovery_count || 0) + 1,
      status: 'agendada',
      scheduled_at: body.scheduled_at || new Date().toISOString(),
      reason: body.reason || 'queda_tecnica',
      resume_context,
      created_at: new Date().toISOString(),
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark conversation as recovery_pending and increment counter
  await supabase
    .from('ana_conversations')
    .update({ status: 'recovery_pending', recovery_count: (conv.recovery_count || 0) + 1, updated_at: new Date().toISOString() })
    .eq('id', conversation_id)

  // Log event
  await supabase.from('ana_conversation_events').insert({
    conversation_id,
    type: 'recovery_started',
    payload: { attempt_no: data.attempt_no, reason: body.reason },
    stage_at_event: conv.stage,
    created_at: new Date().toISOString(),
  })

  return NextResponse.json({ data, resume_context })
}

// PATCH /api/admin/ana-master/recovery  body: { id, status, outcome? }
export async function PATCH(req: NextRequest) {
  const { id, status, outcome, ...rest } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })

  const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString(), ...rest }
  if (status === 'sucesso' || status === 'falha') {
    updates.completed_at = new Date().toISOString()
    if (outcome) updates.outcome = outcome
  }
  if (status === 'em_andamento') updates.started_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('ana_recovery_attempts')
    .update(updates)
    .eq('id', id)
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log event outcome
  if (data && (status === 'sucesso' || status === 'falha')) {
    await supabase.from('ana_conversation_events').insert({
      conversation_id: data.conversation_id,
      type: status === 'sucesso' ? 'recovery_success' : 'recovery_failed',
      payload: { attempt_id: id, outcome },
      created_at: new Date().toISOString(),
    })

    if (status === 'sucesso') {
      await supabase
        .from('ana_conversations')
        .update({ status: 'ativa', updated_at: new Date().toISOString() })
        .eq('id', data.conversation_id)
    }
  }

  return NextResponse.json({ data })
}
