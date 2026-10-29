import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import {
  calcularMetricas, trechosPorEtapa, ativoNoPeriodo, amostraConversas, parseTecnicas, parseAnalise, pagou,
  PROMPT_EXTRAIR, PROMPT_ANALISE, type LeadResumo, type TecnicaExtraida,
} from './core'

export function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const MODELO = () => process.env.ANA_APRENDIZADO_MODEL ?? 'claude-sonnet-5-5'

async function claude(system: string, user: string, maxTokens: number): Promise<string> {
  const client = new Anthropic()
  const msg = await client.messages.create({
    model: MODELO(),
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  })
  return msg.content.map(b => (b.type === 'text' ? b.text : '')).join('')
}

export async function extrairTecnicas(texto: string): Promise<TecnicaExtraida[]> {
  return parseTecnicas(await claude(PROMPT_EXTRAIR, texto.slice(0, 150_000), 8000))
}

const LEAD_COLS = 'id, telefone, etapa_agente, status_pagamento, historico'

// Parte 2: salva trechos por etapa de quem pagou. Idempotente (unique telefone+etapa).
export async function capturarExemplos(leads: LeadResumo[]): Promise<number> {
  const linhas = leads.filter(pagou).flatMap(l =>
    Array.from(trechosPorEtapa(l.historico)).map(([etapa, trecho]) => ({ lead_id: l.id, telefone: l.telefone, etapa, trecho }))
  )
  if (!linhas.length) return 0
  const { error } = await db().from('ana_exemplos').upsert(linhas, { onConflict: 'telefone,etapa', ignoreDuplicates: true })
  if (error) throw new Error(`ana_exemplos: ${error.message}`)
  return linhas.length
}

// Parte 3: relatório semanal com métricas, análise e sugestões pendentes de aprovação.
export async function rodarAnalise(dias = 7): Promise<{ relatorio_id: string; sugestoes: number; exemplos: number }> {
  const supabase = db()
  const fim = new Date()
  const inicio = new Date(fim.getTime() - dias * 86_400_000)

  const desde = inicio.toISOString()
  const { data, error } = await supabase
    .from('leads')
    .select(LEAD_COLS)
    .or(`created_at.gte.${desde},updated_at.gte.${desde}`)
    .limit(2000)
  if (error) throw new Error(`leads: ${error.message}`)
  const leads = ((data ?? []) as LeadResumo[]).filter(l => ativoNoPeriodo(l, inicio))

  const exemplos = await capturarExemplos(leads)
  const metricas = calcularMetricas(leads)

  let analise = 'Sem conversas suficientes no período para analisar.'
  let sugestoes: ReturnType<typeof parseAnalise>['sugestoes'] = []
  if (leads.length >= 3) {
    const vencedores = leads.filter(pagou)
    const parados = leads.filter(l => !pagou(l))
    const amostra = amostraConversas([...vencedores.slice(0, 10), ...parados.slice(0, 15)])
    const r = parseAnalise(await claude(
      PROMPT_ANALISE,
      `MÉTRICAS (últimos ${dias} dias):\n${JSON.stringify(metricas, null, 2)}\n\nCONVERSAS:\n${amostra}`,
      4000,
    ))
    analise = r.analise
    sugestoes = r.sugestoes
  }

  const { data: rel, error: e1 } = await supabase
    .from('ana_relatorios')
    .insert({ periodo_inicio: inicio.toISOString(), periodo_fim: fim.toISOString(), metricas, analise })
    .select('id')
    .single()
  if (e1) throw new Error(`ana_relatorios: ${e1.message}`)

  if (sugestoes.length) {
    const { error: e2 } = await supabase.from('ana_sugestoes').insert(
      sugestoes.map(s => ({ relatorio_id: rel.id, titulo: s.titulo, conteudo: s.conteudo, etapa: s.etapa, situacao: s.situacao, justificativa: s.justificativa }))
    )
    if (e2) throw new Error(`ana_sugestoes: ${e2.message}`)
  }

  return { relatorio_id: rel.id, sugestoes: sugestoes.length, exemplos }
}
