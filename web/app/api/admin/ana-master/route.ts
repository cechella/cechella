import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const table = searchParams.get('table')
  const limit = parseInt(searchParams.get('limit') || '100')

  const allowed = ['ana_simulacoes', 'ana_gold', 'ana_anti_gold', 'ana_scorecard', 'ana_matriz', 'ana_changelog']
  if (!table || !allowed.includes(table)) {
    return NextResponse.json({ error: 'invalid table' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { table, record } = body

  const allowed = ['ana_simulacoes', 'ana_gold', 'ana_anti_gold', 'ana_scorecard', 'ana_matriz', 'ana_changelog']
  if (!table || !allowed.includes(table)) {
    return NextResponse.json({ error: 'invalid table' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from(table)
    .insert({ ...record, created_at: new Date().toISOString() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { table, id, updates } = body

  const allowed = ['ana_simulacoes', 'ana_gold', 'ana_anti_gold', 'ana_scorecard', 'ana_matriz', 'ana_changelog']
  if (!table || !allowed.includes(table)) {
    return NextResponse.json({ error: 'invalid table' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from(table)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const table = searchParams.get('table')
  const id = searchParams.get('id')

  const allowed = ['ana_simulacoes', 'ana_gold', 'ana_anti_gold', 'ana_scorecard', 'ana_matriz', 'ana_changelog']
  if (!table || !allowed.includes(table) || !id) {
    return NextResponse.json({ error: 'invalid params' }, { status: 400 })
  }

  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
