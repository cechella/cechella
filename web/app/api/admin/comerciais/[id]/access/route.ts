import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET — status de acesso do consultor
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = db()
  const { data: comercial } = await supabase
    .from('comerciais')
    .select('email, auth_user_id')
    .eq('id', params.id)
    .single()

  if (!comercial) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!comercial.auth_user_id) return NextResponse.json({ hasAccess: false })

  const { data: { user }, error } = await supabase.auth.admin.getUserById(comercial.auth_user_id)
  if (error || !user) return NextResponse.json({ hasAccess: false })

  return NextResponse.json({
    hasAccess: !user.banned_until,
    lastSignIn: user.last_sign_in_at ?? null,
    createdAt: user.created_at ?? null,
    email: user.email,
  })
}

// POST — criar acesso (cria usuário no Supabase Auth)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { password } = await req.json()
  if (!password || password.length < 8)
    return NextResponse.json({ error: 'Senha deve ter no mínimo 8 caracteres' }, { status: 400 })

  const supabase = db()
  const { data: comercial } = await supabase
    .from('comerciais')
    .select('email, auth_user_id')
    .eq('id', params.id)
    .single()

  if (!comercial?.email)
    return NextResponse.json({ error: 'Consultor não tem email cadastrado' }, { status: 400 })

  if (comercial.auth_user_id)
    return NextResponse.json({ error: 'Consultor já tem acesso. Use PATCH para alterar a senha.' }, { status: 400 })

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: comercial.email,
    password,
    email_confirm: true,
  })

  if (createErr || !created.user)
    return NextResponse.json({ error: createErr?.message ?? 'Erro ao criar usuário' }, { status: 500 })

  await supabase
    .from('comerciais')
    .update({ auth_user_id: created.user.id, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  return NextResponse.json({ ok: true, userId: created.user.id })
}

// PATCH — alterar senha
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { password } = await req.json()
  if (!password || password.length < 8)
    return NextResponse.json({ error: 'Senha deve ter no mínimo 8 caracteres' }, { status: 400 })

  const supabase = db()
  const { data: comercial } = await supabase
    .from('comerciais')
    .select('auth_user_id')
    .eq('id', params.id)
    .single()

  if (!comercial?.auth_user_id)
    return NextResponse.json({ error: 'Consultor não tem acesso criado' }, { status: 404 })

  const { error } = await supabase.auth.admin.updateUserById(comercial.auth_user_id, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE — revogar acesso
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = db()
  const { data: comercial } = await supabase
    .from('comerciais')
    .select('auth_user_id')
    .eq('id', params.id)
    .single()

  if (!comercial?.auth_user_id)
    return NextResponse.json({ error: 'Consultor não tem acesso' }, { status: 404 })

  const { error } = await supabase.auth.admin.deleteUser(comercial.auth_user_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase
    .from('comerciais')
    .update({ auth_user_id: null, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  return NextResponse.json({ ok: true })
}
