import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { db, extrairTecnicas, rodarAnalise, capturarExemplos } from '@/lib/ana-aprendizado/server'
import type { LeadResumo } from '@/lib/ana-aprendizado/core'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const STATUS = ['rascunho', 'teste', 'ativo', 'inativo'] as const

function etapaValida(v: unknown): number | null {
  const n = Number(v)
  return Number.isInteger(n) && n >= 1 && n <= 8 ? n : null
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response
  const supabase = db()
  const [conhecimento, sugestoes, relatorios, exemplos] = await Promise.all([
    supabase.from('ana_conhecimento').select('*').order('updated_at', { ascending: false }).limit(300),
    supabase.from('ana_sugestoes').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('ana_relatorios').select('*').order('created_at', { ascending: false }).limit(12),
    supabase.from('ana_exemplos').select('*').order('destaque', { ascending: false }).order('created_at', { ascending: false }).limit(200),
  ])
  const erro = [conhecimento, sugestoes, relatorios, exemplos].find(r => r.error)?.error
  if (erro) return NextResponse.json({ error: erro.message }, { status: 500 })
  return NextResponse.json({
    conhecimento: conhecimento.data, sugestoes: sugestoes.data, relatorios: relatorios.data, exemplos: exemplos.data,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response
  const supabase = db()
  const body = await req.json().catch(() => ({}))
  const agora = new Date().toISOString()

  try {
    switch (body.acao) {
      case 'criar': {
        const titulo = String(body.titulo ?? '').trim()
        const conteudo = String(body.conteudo ?? '').trim()
        if (!titulo || !conteudo) return NextResponse.json({ error: 'título e conteúdo são obrigatórios' }, { status: 400 })
        const { error } = await supabase.from('ana_conhecimento').insert({
          titulo, conteudo, etapa: etapaValida(body.etapa), situacao: body.situacao || null, fonte: body.fonte || 'manual',
        })
        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'atualizar': {
        const patch: Record<string, unknown> = { updated_at: agora }
        if (typeof body.titulo === 'string') patch.titulo = body.titulo.trim()
        if (typeof body.conteudo === 'string') patch.conteudo = body.conteudo.trim()
        if ('etapa' in body) patch.etapa = etapaValida(body.etapa)
        if ('situacao' in body) patch.situacao = body.situacao || null
        if (body.status) {
          if (!STATUS.includes(body.status)) return NextResponse.json({ error: 'status inválido' }, { status: 400 })
          patch.status = body.status
          if (body.status === 'teste') patch.testado_desde = agora
        }
        const { error } = await supabase.from('ana_conhecimento').update(patch).eq('id', body.id)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'excluir': {
        const { error } = await supabase.from('ana_conhecimento').delete().eq('id', body.id)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'extrair': {
        const texto = String(body.texto ?? '').trim()
        if (texto.length < 200) return NextResponse.json({ error: 'cole um material com pelo menos 200 caracteres' }, { status: 400 })
        const tecnicas = await extrairTecnicas(texto)
        if (!tecnicas.length) return NextResponse.json({ error: 'nenhuma técnica extraída' }, { status: 422 })
        const fonte = String(body.fonte ?? '').trim() || 'material colado'
        const { error } = await supabase.from('ana_conhecimento').insert(tecnicas.map(t => ({ ...t, fonte, status: 'rascunho' })))
        if (error) throw error
        return NextResponse.json({ ok: true, criadas: tecnicas.length })
      }

      case 'aprovar_sugestao': {
        const { data: s, error: e1 } = await supabase.from('ana_sugestoes').select('*').eq('id', body.id).eq('status', 'pendente').maybeSingle()
        if (e1) throw e1
        if (!s) return NextResponse.json({ error: 'sugestão não encontrada ou já decidida' }, { status: 404 })
        const { data: c, error: e2 } = await supabase.from('ana_conhecimento').insert({
          titulo: s.titulo, conteudo: s.conteudo, etapa: s.etapa, situacao: s.situacao,
          fonte: 'relatório semanal', status: 'teste', testado_desde: agora,
        }).select('id').single()
        if (e2) throw e2
        const { error: e3 } = await supabase.from('ana_sugestoes').update({ status: 'aprovada', conhecimento_id: c.id }).eq('id', s.id)
        if (e3) throw e3
        return NextResponse.json({ ok: true })
      }

      case 'recusar_sugestao': {
        const { error } = await supabase.from('ana_sugestoes').update({ status: 'recusada' }).eq('id', body.id).eq('status', 'pendente')
        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'exemplo': {
        const patch: Record<string, boolean> = {}
        if (typeof body.destaque === 'boolean') patch.destaque = body.destaque
        if (typeof body.ativo === 'boolean') patch.ativo = body.ativo
        const { error } = await supabase.from('ana_exemplos').update(patch).eq('id', body.id)
        if (error) throw error
        return NextResponse.json({ ok: true })
      }

      case 'importar_exemplos': {
        const { data, error } = await supabase.from('leads')
          .select('id, telefone, etapa_agente, status_pagamento, historico')
          .eq('status_pagamento', 'pago').limit(1000)
        if (error) throw error
        return NextResponse.json({ ok: true, trechos: await capturarExemplos((data ?? []) as LeadResumo[]) })
      }

      case 'rodar_analise':
        return NextResponse.json({ ok: true, ...(await rodarAnalise(Number(body.dias) || 7)) })

      default:
        return NextResponse.json({ error: 'ação desconhecida' }, { status: 400 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
