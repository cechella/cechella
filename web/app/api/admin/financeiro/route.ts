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
  const tipo = searchParams.get('tipo') || 'resumo'
  const periodo = searchParams.get('periodo') || '30'
  const page = Number(searchParams.get('page') || '1')
  const limit = Number(searchParams.get('limit') || '20')
  const metodo = searchParams.get('metodo') || ''
  const status = searchParams.get('status') || ''
  const busca = searchParams.get('busca') || ''

  if (tipo === 'resumo') {
    const diasAtras = new Date()
    diasAtras.setDate(diasAtras.getDate() - Number(periodo))
    const isoFrom = diasAtras.toISOString()

    const [pagamentosRes, recorrentesRes, leadsRes, grafRes, recusadosRes] = await Promise.all([
      supabase.from('pagamentos').select('valor, status, metodo, created_at').eq('status', 'approved'),
      supabase.from('pagamentos_recorrentes').select('valor, status, parcelas_pagas, parcelas_total, proxima_cobranca'),
      supabase.from('leads').select('id, status_pagamento, tentativas_pagamento'),
      supabase.from('pagamentos').select('valor, created_at').eq('status', 'approved').gte('created_at', isoFrom).order('created_at'),
      supabase.from('pagamentos').select('valor, status_detail, metodo').eq('status', 'rejected'),
    ])

    console.log('[financeiro] leads:', leadsRes.data?.length, 'error:', leadsRes.error?.message)
    console.log('[financeiro] recorrentes:', recorrentesRes.data?.length, 'error:', recorrentesRes.error?.message)

    const pagamentos = pagamentosRes.data || []
    const recorrentes = recorrentesRes.data || []
    const leads = leadsRes.data || []
    const grafData = grafRes.data || []
    const recusados = (recusadosRes.data || [])
    const recusadosAvista = recusados.filter((p: any) => p.metodo === 'cartao_avista')
    const recusadosRecorrentes = recusados.filter((p: any) => p.metodo === 'cartao_recorrente')

    const totalRecebido = pagamentos.reduce((s, p) => s + (p.valor || 0), 0)
    const assinaturasAtivas = recorrentes.filter(r => r.status === 'ativo').length
    const mrrAtivo = recorrentes.filter(r => r.status === 'ativo').reduce((s, r) => s + (r.valor || 0), 0)
    const totalLeads = leads.length
    const leadsPagantes = leads.filter(l => l.status_pagamento === 'pago' || l.status_pagamento === 'aprovado').length
    const leadsRecuperacao = leads.filter(l => l.status_pagamento === 'recuperacao_necessaria' || l.status_pagamento === 'inadimplente').length
    const taxaConversao = totalLeads > 0 ? Math.round((leadsPagantes / totalLeads) * 100) : 0

    const aVistaTotais = pagamentos.filter(p => p.metodo === 'cartao_avista')
    const recorrenteTotais = pagamentos.filter(p => p.metodo === 'cartao_recorrente')
    const pixTotais = pagamentos.filter(p => p.metodo === 'pix')

    const porDia: Record<string, number> = {}
    grafData.forEach(p => {
      const dia = p.created_at.split('T')[0]
      porDia[dia] = (porDia[dia] || 0) + (p.valor || 0)
    })
    const graficoReceita = Object.entries(porDia).map(([data, valor]) => ({
      data: data.slice(5),
      valor,
    }))

    return NextResponse.json({
      totalRecebido,
      mrrAtivo,
      assinaturasAtivas,
      taxaConversao,
      totalLeads,
      leadsPagantes,
      leadsRecuperacao,
      aVistaCount: aVistaTotais.length,
      aVistaTotal: aVistaTotais.reduce((s, p) => s + (p.valor || 0), 0),
      recorrenteCount: recorrenteTotais.length,
      recorrenteTotal: recorrenteTotais.reduce((s, p) => s + (p.valor || 0), 0),
      pixCount: pixTotais.length,
      pixTotal: pixTotais.reduce((s, p) => s + (p.valor || 0), 0),
      recusadosCount: recusados.length,
      recusadosTotal: recusados.reduce((s: number, p: any) => s + (p.valor || 0), 0),
      inadimplentesCount: recusadosRecorrentes.length,
      inadimplentesTotal: recusadosRecorrentes.reduce((s: number, p: any) => s + (p.valor || 0), 0),
      graficoReceita,
    })
  }

  if (tipo === 'pagamentos') {
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('pagamentos')
      .select('*, leads!pagamentos_lead_telefone_fkey(nome)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (metodo) query = query.eq('metodo', metodo)
    if (status) query = query.eq('status', status)
    if (busca) query = query.or(`lead_telefone.ilike.%${busca}%`)

    const { data, count, error } = await query

    if (error) {
      let q2 = supabase
        .from('pagamentos')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)
      if (metodo) q2 = q2.eq('metodo', metodo)
      if (status) q2 = q2.eq('status', status)
      if (busca) q2 = q2.ilike('lead_telefone', `%${busca}%`)

      const r2 = await q2
      const telefones = (r2.data || []).map((p: any) => p.lead_telefone).filter(Boolean)
      const nomesRes = telefones.length > 0
        ? await supabase.from('leads').select('telefone, nome').in('telefone', telefones)
        : { data: [] }
      const nomesMap: Record<string, string> = {}
      ;(nomesRes.data || []).forEach((l: any) => { nomesMap[l.telefone] = l.nome })
      const enriched = (r2.data || []).map((p: any) => ({ ...p, nome: nomesMap[p.lead_telefone] || null }))
      return NextResponse.json({ pagamentos: enriched, total: r2.count || 0, page, limit })
    }

    const enriched = (data || []).map((p: any) => ({ ...p, nome: p.leads?.nome || null }))
    return NextResponse.json({ pagamentos: enriched, total: count || 0, page, limit })
  }

  return NextResponse.json({ erro: 'tipo inválido' }, { status: 400 })
}
