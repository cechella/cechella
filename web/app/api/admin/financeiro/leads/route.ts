import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: (url: RequestInfo | URL, opts: RequestInit = {}) => fetch(url, { ...opts, cache: 'no-store' }) },
    }
  )

  const { searchParams } = req.nextUrl
  const filtro = searchParams.get('filtro') || ''
  const busca = searchParams.get('busca') || ''
  const page = Number(searchParams.get('page') || '1')
  const limit = Number(searchParams.get('limit') || '25')
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('leads')
    .select('id, nome, telefone, status_pagamento, tentativas_pagamento, created_at, etapa', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filtro === 'pago') {
    query = query.in('status_pagamento', ['pago', 'aprovado'])
  } else if (filtro === 'recuperacao') {
    query = query.eq('status_pagamento', 'recuperacao_necessaria')
  } else if (filtro === 'sem_tentativa') {
    query = query.eq('tentativas_pagamento', 0)
  }

  if (busca) {
    query = query.or(`nome.ilike.%${busca}%,telefone.ilike.%${busca}%`)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  // Funil — sem filtros para mostrar totais reais
  const [totalRes, pagosRes, tentativasRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }).in('status_pagamento', ['pago', 'aprovado']),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gt('tentativas_pagamento', 0),
  ])

  return NextResponse.json({
    leads: data || [],
    total: count || 0,
    page,
    limit,
    funil: {
      cadastrados: totalRes.count || 0,
      tentaram: tentativasRes.count || 0,
      pagos: pagosRes.count || 0,
    },
  })
}
