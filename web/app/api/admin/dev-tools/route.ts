import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: (url: RequestInfo | URL, opts: RequestInit = {}) => fetch(url, { ...opts, cache: 'no-store' }) },
    }
  )
}

export async function POST(req: NextRequest) {
  const { action, telefone } = await req.json()
  const supabase = makeClient()

  try {
    if (action === 'listar_leads') {
      const { data, error } = await supabase
        .from('leads')
        .select('id, nome, telefone, etapa_agente, status_pagamento, metodo_pagamento, tentativas_pagamento, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return NextResponse.json({ data })
    }

    if (action === 'resetar_lead') {
      if (!telefone) return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 })
      const { data, error } = await supabase
        .from('leads')
        .update({
          historico: [],
          etapa_agente: 1,
          nome: null,
          dor_principal: null,
          status_pagamento: null,
          metodo_pagamento: null,
          tentativas_pagamento: 0,
          atendimento_humano: false,
        })
        .like('telefone', `%${telefone.replace(/\D/g, '').slice(-8)}%`)
        .select('id, nome, telefone, etapa_agente, status_pagamento, metodo_pagamento')
      if (error) throw error
      return NextResponse.json({ data, rows: data?.length ?? 0 })
    }

    if (action === 'deletar_lead') {
      if (!telefone) return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 })
      const { data, error } = await supabase
        .from('leads')
        .delete()
        .like('telefone', `%${telefone.replace(/\D/g, '').slice(-8)}%`)
        .select('id, nome, telefone')
      if (error) throw error
      return NextResponse.json({ data, rows: data?.length ?? 0 })
    }

    if (action === 'resetar_referidos') {
      if (!telefone) return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 })
      const { data, error } = await supabase
        .from('contatos_referidos')
        .update({ status: 'aguardando' })
        .like('telefone', `%${telefone.replace(/\D/g, '').slice(-9)}%`)
        .select('id, nome, telefone, status')
      if (error) throw error
      return NextResponse.json({ data, rows: data?.length ?? 0 })
    }

    if (action === 'limpar_todos_leads') {
      const { data, error } = await supabase
        .from('leads')
        .delete()
        .gte('created_at', '2000-01-01')
        .select('id')
      if (error) throw error
      return NextResponse.json({ data, rows: data?.length ?? 0 })
    }

    if (action === 'limpar_todos_referidos') {
      const { data, error } = await supabase
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
