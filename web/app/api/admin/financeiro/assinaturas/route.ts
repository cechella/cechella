import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text'
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'

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

export async function GET() {
  const supabase = makeClient()
  const { data, error } = await supabase
    .from('pagamentos_recorrentes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ assinaturas: [], erro: error.message })

  const rows = data || []
  const telefones = rows.map((r: any) => r.lead_telefone).filter(Boolean)
  const nomesRes = telefones.length > 0
    ? await supabase.from('leads').select('telefone, nome').in('telefone', telefones)
    : { data: [] }

  const nomesMap: Record<string, string> = {}
  ;(nomesRes.data || []).forEach((l: any) => { nomesMap[l.telefone] = l.nome })

  return NextResponse.json({
    assinaturas: rows.map((r: any) => ({ ...r, nome: nomesMap[r.lead_telefone] || null })),
  })
}

export async function POST(req: NextRequest) {
  const supabase = makeClient()
  const { action, id, telefone, nome } = await req.json()

  if (action === 'cancelar') {
    const { error } = await supabase
      .from('pagamentos_recorrentes')
      .update({ status: 'cancelado', updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'marcar_pago') {
    const { data: atual } = await supabase
      .from('pagamentos_recorrentes')
      .select('parcelas_pagas, parcelas_total')
      .eq('id', id)
      .single()
    if (!atual) return NextResponse.json({ ok: false, erro: 'Não encontrada' }, { status: 404 })
    const novasPagas = Math.min(atual.parcelas_pagas + 1, atual.parcelas_total)
    const novoStatus = novasPagas >= atual.parcelas_total ? 'concluido' : 'ativo'
    const proxima = new Date()
    proxima.setMonth(proxima.getMonth() + 1)
    const { error } = await supabase
      .from('pagamentos_recorrentes')
      .update({
        parcelas_pagas: novasPagas,
        status: novoStatus,
        proxima_cobranca: novoStatus === 'concluido' ? null : proxima.toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, parcelas_pagas: novasPagas, status: novoStatus })
  }

  if (action === 'enviar_lembrete') {
    if (!telefone) return NextResponse.json({ ok: false, erro: 'Telefone obrigatório' }, { status: 400 })
    const mensagem = `Olá${nome ? ', ' + nome : ''}! 👋\n\nPassando para lembrar que sua parcela do Programa Hormonal do Dr. Vinícius está próxima.\n\nQualquer dúvida, estou aqui! 💙`
    const resp = await fetch(ZAPI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
      body: JSON.stringify({ phone: telefone, message: mensagem }),
    })
    if (!resp.ok) return NextResponse.json({ ok: false, erro: 'Falha Z-API' }, { status: 502 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: false, erro: 'Ação inválida' }, { status: 400 })
}
