// Lógica pura da plataforma de aprendizado da Ana (sem rede), testada em core.test.ts.

export type Msg = { role: string; content: string; ts?: string; etapa?: number; grupo?: 'A' | 'B' }
export type LeadResumo = {
  id: string
  telefone: string
  etapa_agente: number | null
  status_pagamento: string | null
  historico: Msg[] | null
}

export const ETAPAS: Record<number, string> = {
  1: 'Apresentação', 2: 'Qualificação', 3: 'Combinado', 4: 'Speech',
  5: 'Fechamento', 6: 'Aguardando pagamento', 7: 'Referidos', 8: 'Validação',
}

// Mesmo cálculo em ana-master/src/aprendizado.ts — os dois precisam continuar idênticos.
export function grupoTeste(telefone: string): 'A' | 'B' {
  const digits = String(telefone).replace(/\D/g, '')
  const norm = digits.startsWith('55') ? digits : `55${digits}`
  let h = 5381
  for (let i = 0; i < norm.length; i++) h = ((h * 33) ^ norm.charCodeAt(i)) >>> 0
  return h % 2 === 0 ? 'A' : 'B'
}

export function ativoNoPeriodo(lead: Pick<LeadResumo, 'historico'>, desde: Date): boolean {
  return (lead.historico ?? []).some(m => m?.ts && new Date(m.ts) >= desde)
}

export function pagou(lead: Pick<LeadResumo, 'status_pagamento'>): boolean {
  return lead.status_pagamento === 'pago'
}

type Grupo = { leads: number; pagos: number; conversao: number }
export type Metricas = {
  total_leads: number
  pagos: number
  conversao: number
  parados_por_etapa: Record<string, number>
  grupos: { A: Grupo; B: Grupo }
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0)

export function calcularMetricas(leads: LeadResumo[]): Metricas {
  const parados: Record<string, number> = {}
  const g = { A: { leads: 0, pagos: 0, conversao: 0 }, B: { leads: 0, pagos: 0, conversao: 0 } }
  let pagos = 0
  for (const l of leads) {
    const grp = g[grupoTeste(l.telefone)]
    grp.leads++
    if (pagou(l)) {
      pagos++
      grp.pagos++
    } else {
      const e = String(l.etapa_agente ?? 1)
      parados[e] = (parados[e] ?? 0) + 1
    }
  }
  g.A.conversao = pct(g.A.pagos, g.A.leads)
  g.B.conversao = pct(g.B.pagos, g.B.leads)
  return { total_leads: leads.length, pagos, conversao: pct(pagos, leads.length), parados_por_etapa: parados, grupos: g }
}

// Quebra o histórico de um lead que pagou em trechos por etapa (só mensagens marcadas com etapa).
export function trechosPorEtapa(historico: Msg[] | null, maxMsgs = 8): Map<number, Array<{ role: string; content: string }>> {
  const porEtapa = new Map<number, Array<{ role: string; content: string }>>()
  for (const m of historico ?? []) {
    if (!m?.etapa || !m.content || (m.role !== 'user' && m.role !== 'assistant')) continue
    const lista = porEtapa.get(m.etapa) ?? []
    lista.push({ role: m.role, content: m.content })
    porEtapa.set(m.etapa, lista)
  }
  porEtapa.forEach((lista, etapa) => porEtapa.set(etapa, lista.slice(-maxMsgs)))
  return porEtapa
}

// Resumo de conversas para o Claude analisar (limita tamanho total).
export function amostraConversas(leads: LeadResumo[], maxLeads = 25, maxCharsPorLead = 1500): string {
  return leads.slice(0, maxLeads).map(l => {
    const msgs = (l.historico ?? []).slice(-16)
      .map(m => `${m.role === 'assistant' ? 'Ana' : 'Lead'}${m.etapa ? ` [e${m.etapa}]` : ''}: ${m.content}`)
      .join('\n')
    const status = pagou(l) ? 'PAGOU' : `PAROU NA ETAPA ${l.etapa_agente ?? 1}`
    return `### Lead ${l.id.slice(0, 8)} — ${status}\n${msgs.slice(-maxCharsPorLead)}`
  }).join('\n\n')
}

export type TecnicaExtraida = { titulo: string; conteudo: string; etapa: number | null; situacao: string | null }

// Lê o primeiro array JSON da resposta do Claude e descarta itens inválidos.
export function parseTecnicas(texto: string): TecnicaExtraida[] {
  const match = texto.match(/\[[\s\S]*\]/)
  if (!match) return []
  let bruto: unknown
  try { bruto = JSON.parse(match[0]) } catch { return [] }
  if (!Array.isArray(bruto)) return []
  return bruto.flatMap((x: any) => {
    const titulo = typeof x?.titulo === 'string' ? x.titulo.trim() : ''
    const conteudo = typeof x?.conteudo === 'string' ? x.conteudo.trim() : ''
    if (!titulo || !conteudo) return []
    const n = Number(x?.etapa)
    const etapa = Number.isInteger(n) && n >= 1 && n <= 8 ? n : null
    const situacao = typeof x?.situacao === 'string' && x.situacao.trim() ? x.situacao.trim().toLowerCase() : null
    return [{ titulo: titulo.slice(0, 200), conteudo: conteudo.slice(0, 2000), etapa, situacao }]
  })
}

export const CONTEXTO_ANA = `A Ana é a consultora de vendas por WhatsApp do Hormone Ecosystem (Dr. Vinícius Cechella). Vende implante hormonal bioidêntico por R$ 5.000 seguindo 8 etapas:
1 Apresentação, 2 Qualificação (dor), 3 Combinado (acordo de decisão, pergunta sobre marido/viagem), 4 Speech (apresentação do protocolo), 5 Fechamento (preço e forma de pagamento), 6 Aguardando pagamento, 7 Referidos (pedir indicações), 8 Validação dos indicados.
Regras que NUNCA podem ser contrariadas: não mudar o preço, não prometer cura, respeitar as normas do CFM sobre publicidade médica, não pressionar de forma desonesta, não mencionar consulta/exames antes da hora.`

export const PROMPT_EXTRAIR = `${CONTEXTO_ANA}

Você recebe material de treinamento de vendas (transcrição, anotações). Extraia de 5 a 15 técnicas práticas que a Ana possa aplicar em conversas de WhatsApp.
Cada técnica: título curto; conteúdo com quando usar + como dizer (com uma frase de exemplo adaptada ao contexto da Ana, em português, tom acolhedor); etapa (1-8) onde mais se aplica ou null se vale para todas; situacao em uma palavra (ex.: rapport, dor, decisor, preco, objecao, fechamento, indicacao, pos-venda).
Descarte o que não serve para venda de saúde por WhatsApp ou que contrarie as regras.
Responda SOMENTE com um array JSON: [{"titulo":"...","conteudo":"...","etapa":3,"situacao":"decisor"}]`

export const PROMPT_ANALISE = `${CONTEXTO_ANA}

Você é o analista de vendas da Ana. Recebe as métricas da semana e uma amostra de conversas (que pagaram e que pararam).
1. Escreva uma análise curta (até 12 linhas) em português: onde os leads mais param, o que as conversas vencedoras fizeram de diferente, e se o grupo B (com técnicas em teste) converteu mais ou menos que o grupo A.
2. Proponha de 1 a 5 melhorias concretas, cada uma como uma técnica nova para o material de consulta da Ana (não como reescrita do roteiro).
Responda SOMENTE com JSON neste formato:
{"analise":"...","sugestoes":[{"titulo":"...","conteudo":"quando usar + como dizer","etapa":4,"situacao":"preco","justificativa":"evidência nas conversas"}]}`

export type Analise = { analise: string; sugestoes: Array<TecnicaExtraida & { justificativa: string }> }

export function parseAnalise(texto: string): Analise {
  const match = texto.match(/\{[\s\S]*\}/)
  if (!match) return { analise: texto.trim(), sugestoes: [] }
  let bruto: any
  try { bruto = JSON.parse(match[0]) } catch { return { analise: texto.trim(), sugestoes: [] } }
  const brutas: any[] = Array.isArray(bruto?.sugestoes) ? bruto.sugestoes : []
  const sugestoes = brutas.flatMap(s => parseTecnicas(JSON.stringify([s])).map(t => ({
    ...t,
    justificativa: typeof s?.justificativa === 'string' ? s.justificativa : '',
  })))
  return { analise: typeof bruto?.analise === 'string' ? bruto.analise : '', sugestoes }
}
