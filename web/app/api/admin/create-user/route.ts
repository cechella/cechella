import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  const { email, password, role } = await req.json()
  if (!email || !password) return NextResponse.json({ ok: false, error: 'email e password obrigatórios' }, { status: 400 })

  // Cria usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return NextResponse.json({ ok: false, error: authError.message }, { status: 400 })

  // Cria perfil na tabela profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: authData.user.id, email, role: role || 'patient' })

  if (profileError) {
    return NextResponse.json({ ok: true, warning: 'Usuário criado mas perfil falhou: ' + profileError.message, user: authData.user })
  }

  return NextResponse.json({ ok: true, user: authData.user })
}
