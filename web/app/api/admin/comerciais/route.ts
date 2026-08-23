import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const supabase = db()
  const { data, error } = await supabase
    .from('comerciais')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = db()
  const body = await req.json()
  const { data, error } = await supabase
    .from('comerciais')
    .insert({
      nome:          body.nome,
      cargo:         body.cargo ?? null,
      telefone:      body.telefone ?? null,
      email:         body.email ?? null,
      cnpj:          body.cnpj ?? null,
      razao_social:  body.razao_social ?? null,
      endereco:      body.endereco ?? null,
      cidade:        body.cidade ?? null,
      estado:        body.estado ?? null,
      disponivel:    body.disponivel ?? true,
      max_referidos: body.max_referidos ?? 10,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
