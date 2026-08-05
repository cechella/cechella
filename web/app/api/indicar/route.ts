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

  // Busca contatos já enviados por este lead
  const { data: jaEnviados } = await supabase
    .from('contatos_referidos')
    .select('nome, telefone, profissao, hobby')
    .eq('indicado_por_telefone', lead.telefone)
    .eq('tipo_envio', 'link_indicacao')

  return NextResponse.json(
    { nome: lead.nome, telefone: lead.telefone, jaEnviados: jaEnviados || [] },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } }
  )
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

    const filtrados = registros.filter((r: any) => r.telefone && r.telefone.length >= 8)
    // Deduplica por telefone (mantém o último) para evitar conflito no upsert
    const validos = Object.values(
      filtrados.reduce((acc: any, r: any) => ({ ...acc, [r.telefone]: r }), {})
    )
    if (!validos.length) return NextResponse.json({ error: 'Nenhum contato válido' }, { status: 400 })

    const { error } = await supabase.from('contatos_referidos').upsert(validos, {
      onConflict: 'telefone,indicado_por_telefone',
      ignoreDuplicates: false,
    })
    if (error) throw error

    // Atualiza sessao_wpp com profissao/hobby para persistir no reload
    const { data: sessao } = await supabase
      .from('sessao_wpp')
      .select('contatos')
      .eq('token', token)
      .maybeSingle()

    if (sessao?.contatos?.length) {
      const profHobbyMap = new Map(
        (validos as any[]).map((v: any) => [v.telefone, { profissao: v.profissao, hobby: v.hobby }])
      )
      const updated = sessao.contatos.map((c: any) => {
        const ph = profHobbyMap.get(String(c.telefone).replace(/\D/g, ''))
        return ph ? { ...c, profissao: ph.profissao, hobby: ph.hobby } : c
      })
      await supabase.from('sessao_wpp').update({ contatos: updated }).eq('token', token)
    }

    return NextResponse.json({ ok: true, salvos: (validos as any[]).length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
