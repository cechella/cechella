import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

async function getAuthUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const user = await getAuthUser()
  if (!user?.email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: comercial } = await db()
    .from('comerciais')
    .select('id, nome, email, cargo, telefone, cpf, cnpj, razao_social, banco_dados')
    .eq('email', user.email)
    .single()

  if (!comercial) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  return NextResponse.json(comercial)
}

export async function PATCH(req: NextRequest) {
  const user = await getAuthUser()
  if (!user?.email) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const supabase = db()

  const { data: comercial } = await supabase
    .from('comerciais')
    .select('id, cpf')
    .eq('email', user.email)
    .single()

  if (!comercial) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.nome !== undefined) patch.nome = body.nome
  if (body.telefone !== undefined) patch.telefone = body.telefone
  // CPF: only allow setting if not yet set
  if (body.cpf !== undefined && !comercial.cpf) patch.cpf = body.cpf
  if (body.cnpj !== undefined) patch.cnpj = body.cnpj
  if (body.razao_social !== undefined) patch.razao_social = body.razao_social
  if (body.banco_dados !== undefined) patch.banco_dados = body.banco_dados

  const { error } = await supabase
    .from('comerciais')
    .update(patch)
    .eq('id', comercial.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
