import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET — valida token e retorna nome do indicador
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token obrigatório' }, { status: 400 })

  const { data: lead } = await supabase
    .from('leads')
    .select('id, nome, telefone')
    .eq('token_indicacao', token)
    .single()

  if (!lead) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
  return NextResponse.json({ nome: lead.nome, telefone: lead.telefone })
}

// POST — salva os referidos indicados
export async function POST(req: NextRequest) {
  try {
    const { token, contatos } = await req.json()
    if (!token || !contatos?.length) {
      return NextResponse.json({ error: 'token e contatos são obrigatórios' }, { status: 400 })
    }

    const { data: lead } = await supabase
      .from('leads')
      .select('id, nome, telefone')
      .eq('token_indicacao', token)
      .single()

    if (!lead) return NextResponse.json({ error: 'Link inválido' }, { status: 404 })

    const registros = contatos.map((c: any) => ({
      indicado_por_telefone: lead.telefone,
      indicado_por_nome: lead.nome,
      nome: c.nome || null,
      telefone: c.telefone?.replace(/\D/g, '') || null,
      profissao: c.profissao || null,
      hobby: c.hobby || null,
      prioridade: (c.profissao && c.hobby) ? 1 : 2,
      status: 'aguardando',
      tipo_envio: 'link_indicacao',
    }))

    const validos = registros.filter((r: any) => r.telefone && r.telefone.length >= 8)
    if (!validos.length) return NextResponse.json({ error: 'Nenhum contato válido' }, { status: 400 })

    const { error } = await supabase.from('contatos_referidos').upsert(validos, {
      onConflict: 'telefone,indicado_por_telefone',
      ignoreDuplicates: false,
    })
    if (error) throw error

    return NextResponse.json({ ok: true, salvos: validos.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
