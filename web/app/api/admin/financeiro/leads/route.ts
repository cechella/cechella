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

  // Para filtro assinatura_concluida, buscar telefones com assinatura concluída
  let telefonesConcluidos: string[] = []
  if (filtro === 'assinatura_concluida') {
    const { data: assinaturas } = await supabase
      .from('pagamentos_recorrentes')
      .select('lead_telefone, parcelas_pagas, parcelas_total')
      .eq('status', 'ativo')
    telefonesConcluidos = (assinaturas || [])
      .filter((a: any) => a.parcelas_pagas >= a.parcelas_total)
      .map((a: any) => a.lead_telefone)
    const { data: concluidas } = await supabase
      .from('pagamentos_recorrentes')
      .select('lead_telefone')
      .eq('status', 'concluido')
    ;(concluidas || []).forEach((a: any) => {
      if (!telefonesConcluidos.includes(a.lead_telefone)) telefonesConcluidos.push(a.lead_telefone)
    })
  }

  let query = supabase
    .from('leads')
    .select('id, nome, telefone, status_pagamento, tentativas_pagamento, created_at, etapa_agente', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (filtro === 'pago') {
    query = query.in('status_pagamento', ['pago', 'aprovado'])
  } else if (filtro === 'recuperacao') {
    query = query.eq('status_pagamento', 'recuperacao_necessaria')
  } else if (filtro === 'sem_tentativa') {
    query = query.eq('tentativas_pagamento', 0)
  } else if (filtro === 'assinatura_concluida') {
    if (telefonesConcluidos.length > 0) {
      query = query.in('telefone', telefonesConcluidos)
    } else {
      return NextResponse.json({ leads: [], total: 0, page, limit, funil: { cadastrados: 0, tentaram: 0, pagos: 0 } })
    }
  }

  if (busca) {
    query = query.or(`nome.ilike.%${busca}%,telefone.ilike.%${busca}%`)
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  const leads = data || []

  // Buscar último pagamento para cada lead
  const telefones = leads.map((l: any) => l.telefone).filter(Boolean)
  const ultimosPagamentos: Record<string, string> = {}
  if (telefones.length > 0) {
    const { data: pagamentos } = await supabase
      .from('pagamentos')
      .select('lead_telefone, created_at')
      .in('lead_telefone', telefones)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    ;(pagamentos || []).forEach((p: any) => {
      if (!ultimosPagamentos[p.lead_telefone]) ultimosPagamentos[p.lead_telefone] = p.created_at
    })
  }

  const [totalRes, pagosRes, tentativasRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }).in('status_pagamento', ['pago', 'aprovado']),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gt('tentativas_pagamento', 0),
  ])

  return NextResponse.json({
    leads: leads.map((l: any) => ({ ...l, etapa: l.etapa_agente, ultimo_pagamento: ultimosPagamentos[l.telefone] || null })),
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
