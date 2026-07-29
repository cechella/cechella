import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const supabase = makeClient()
  const { data, error } = await supabase
    .from('produtos')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, produtos: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, produto } = body

  const supabase = makeClient()

  if (action === 'upsert') {
    const { error } = await supabase
      .from('produtos')
      .upsert(produto, { onConflict: 'slug' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'toggle') {
    const { slug, ativo } = body
    const { error } = await supabase
      .from('produtos')
      .update({ ativo })
      .eq('slug', slug)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'delete') {
    const { slug } = body
    const { error } = await supabase
      .from('produtos')
      .delete()
      .eq('slug', slug)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
}
