import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  const { action, telefone, id } = await req.json()

  try {
    if (action === 'listar_leads') {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .select('id, nome, telefone, etapa_agente, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return NextResponse.json({ data })
    }

    if (action === 'resetar_lead') {
      if (!telefone) return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 })
      const { data, error } = await supabaseAdmin
        .from('leads')
        .update({ historico: [], etapa_agente: 1, nome: null, dor_principal: null })
        .like('telefone', `%${telefone.replace(/\D/g, '').slice(-8)}%`)
        .select('id, nome, telefone, etapa_agente')
      if (error) throw error
      return NextResponse.json({ data, rows: data?.length ?? 0 })
    }

    if (action === 'deletar_lead') {
      if (!telefone) return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 })
      const { data, error } = await supabaseAdmin
        .from('leads')
        .delete()
        .like('telefone', `%${telefone.replace(/\D/g, '').slice(-8)}%`)
        .select('id, nome, telefone')
      if (error) throw error
      return NextResponse.json({ data, rows: data?.length ?? 0 })
    }

    if (action === 'resetar_referidos') {
      if (!telefone) return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 })
      const { data, error } = await supabaseAdmin
        .from('contatos_referidos')
        .update({ status: 'aguardando' })
        .like('telefone', `%${telefone.replace(/\D/g, '').slice(-9)}%`)
        .select('id, nome, telefone, status')
      if (error) throw error
      return NextResponse.json({ data, rows: data?.length ?? 0 })
    }

    if (action === 'limpar_todos_leads') {
      const { data, error } = await supabaseAdmin
        .from('leads')
        .delete()
        .gte('created_at', '2000-01-01')
        .select('id')
      if (error) throw error
      return NextResponse.json({ data, rows: data?.length ?? 0 })
    }

    if (action === 'limpar_todos_referidos') {
      const { data, error } = await supabaseAdmin
        .from('contatos_referidos')
        .delete()
        .gte('created_at', '2000-01-01')
        .select('id')
      if (error) throw error
      return NextResponse.json({ data, rows: data?.length ?? 0 })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
