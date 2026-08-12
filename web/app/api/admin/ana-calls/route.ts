import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status')

  let query = supabase
    .from('ana_calls')
    .select('id, call_sid, telefone, stage, status, gates_passed, memories, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const res = NextResponse.json(data ?? [])
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  return res
}
