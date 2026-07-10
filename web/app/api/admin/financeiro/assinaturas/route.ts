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
  const page = Number(searchParams.get('page') || '1')
  const limit = Number(searchParams.get('limit') || '20')
  const status = searchParams.get('status') || ''
  const busca = searchParams.get('busca') || ''

  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('pagamentos_recorrentes')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) query = query.eq('status', status)
  if (busca) query = query.ilike('lead_telefone', `%${busca}%`)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 })
  }

  const telefones = (data || []).map((r: any) => r.lead_telefone).filter(Boolean)
  const nomesRes = telefones.length > 0
    ? await supabase.from('leads').select('telefone, nome').in('telefone', telefones)
    : { data: [] }
  const nomesMap: Record<string, string> = {}
  ;(nomesRes.data || []).forEach((l: any) => { nomesMap[l.telefone] = l.nome })

  const enriched = (data || []).map((r: any) => ({ ...r, nome: nomesMap[r.lead_telefone] || null }))

  return NextResponse.json({ assinaturas: enriched, total: count || 0, page, limit })
}
