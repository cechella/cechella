// Conferência VISUAL das fotos antes de o carrossel ir para o CEO: o VERVE olha cada foto (modelo de visão) e só deixa passar a que cumpre o briefing
// (faixa etária APARENTE, gênero da persona, sem texto/marca d'água, sem deformação, sem conteúdo impróprio). Reprovou: refaz a foto com uma correção
// explícita e registra POR QUÊ. Esgotou as tentativas: o slide falha e o carrossel não vai para aprovação (falha fechada).
// Nunca infere nacionalidade, etnia ou identidade pela aparência; só idade aparente e gênero apresentado, para o enquadramento do público do briefing.
import Anthropic from '@anthropic-ai/sdk'
import type { Faixa } from './persona'

export interface Laudo {
  idade_aparente_min: number
  idade_aparente_max: number
  genero_apresentado: 'feminino' | 'masculino' | 'indefinido'
  pessoas: number
  texto_ou_marca_dagua: boolean
  deformidade_visivel: boolean
  conteudo_improprio: boolean
  observacao: string
}
export interface Falha { codigo: 'idade_menor' | 'idade_maior' | 'genero' | 'sem_pessoa' | 'texto' | 'deformidade' | 'improprio'; motivo: string }
export interface QaEntrada { slide: number; tentativa: number; ok: boolean; falhas: Falha[]; acao?: string }

export const TOLERANCIA_ANOS = 2
export const MAX_TENTATIVAS = 3   // a original + 2 correções (cada uma gasta uma foto paga e uma leitura)

export function validarLaudo(x: unknown): Laudo | null {
  const o = x as Record<string, unknown>
  if (!o || typeof o !== 'object') return null
  const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const min = n(o.idade_aparente_min), max = n(o.idade_aparente_max), pessoas = n(o.pessoas)
  if (min === null || max === null || pessoas === null || min < 0 || max > 120 || min > max) return null
  if (!['feminino', 'masculino', 'indefinido'].includes(String(o.genero_apresentado))) return null
  if (typeof o.texto_ou_marca_dagua !== 'boolean' || typeof o.deformidade_visivel !== 'boolean' || typeof o.conteudo_improprio !== 'boolean') return null
  return { idade_aparente_min: min, idade_aparente_max: max, genero_apresentado: o.genero_apresentado as Laudo['genero_apresentado'], pessoas, texto_ou_marca_dagua: o.texto_ou_marca_dagua, deformidade_visivel: o.deformidade_visivel, conteudo_improprio: o.conteudo_improprio, observacao: typeof o.observacao === 'string' ? o.observacao.slice(0, 200) : '' }
}

// Decisão determinística (testada): o modelo só descreve; quem aprova é esta função, com a faixa e a persona do briefing.
export function avaliar(laudo: Laudo, persona: string, faixa: Faixa): { ok: boolean; falhas: Falha[] } {
  const falhas: Falha[] = []
  const meio = (laudo.idade_aparente_min + laudo.idade_aparente_max) / 2
  if (laudo.pessoas < 1) falhas.push({ codigo: 'sem_pessoa', motivo: 'não há pessoa na foto' })
  else {
    if (meio < faixa.min - TOLERANCIA_ANOS) falhas.push({ codigo: 'idade_menor', motivo: `idade aparente ~${Math.round(meio)} anos, abaixo da faixa ${faixa.min} a ${faixa.max}` })
    if (meio > faixa.max + TOLERANCIA_ANOS) falhas.push({ codigo: 'idade_maior', motivo: `idade aparente ~${Math.round(meio)} anos, acima da faixa ${faixa.min} a ${faixa.max}` })
    const esperado = persona === 'homem_40_60' ? 'masculino' : 'feminino'
    if (laudo.genero_apresentado !== esperado && laudo.genero_apresentado !== 'indefinido') falhas.push({ codigo: 'genero', motivo: `a persona do briefing é ${esperado} e a foto apresenta ${laudo.genero_apresentado}` })
  }
  if (laudo.texto_ou_marca_dagua) falhas.push({ codigo: 'texto', motivo: 'a foto tem texto, letras ou marca d’água' })
  if (laudo.deformidade_visivel) falhas.push({ codigo: 'deformidade', motivo: 'deformação visível (mãos, rosto ou anatomia)' })
  if (laudo.conteudo_improprio) falhas.push({ codigo: 'improprio', motivo: 'conteúdo impróprio para publicidade médica' })
  return { ok: falhas.length === 0, falhas }
}

// Correção explícita para a próxima geração (inglês, para o gerador de imagem), uma por tipo de falha.
export function correcaoPara(falhas: Falha[], persona: string, faixa: Faixa): string {
  const alvo = Math.round((faixa.min + faixa.max) / 2)
  const sujeito = persona === 'homem_40_60' ? 'man' : 'woman'
  const partes: string[] = []
  for (const f of falhas) {
    if (f.codigo === 'idade_menor') partes.push(`the ${sujeito} must clearly look around ${alvo + 3} years old: visible fine lines, gray hair, mature skin, definitely not young`)
    if (f.codigo === 'idade_maior') partes.push(`the ${sujeito} must look around ${alvo - 3} years old, mature but not elderly`)
    if (f.codigo === 'genero') partes.push(`the main person must be a ${sujeito}`)
    if (f.codigo === 'sem_pessoa') partes.push(`a ${sujeito} must be clearly visible in the frame`)
    if (f.codigo === 'texto') partes.push('absolutely no text, letters, logos or watermarks anywhere')
    if (f.codigo === 'deformidade') partes.push('natural anatomy, well-formed face and hands, no distortions')
    if (f.codigo === 'improprio') partes.push('conservative, professional, fully clothed, clinical editorial mood')
  }
  return partes.join('; ').slice(0, 300)
}

const SISTEMA = 'Você confere uma foto para um carrossel educativo de saúde no Instagram. Descreva o que VÊ, sem identificar ninguém e sem inferir nacionalidade ou etnia. ' +
  'Responda SOMENTE JSON: {"idade_aparente_min":int,"idade_aparente_max":int (faixa de idade APARENTE da pessoa principal, com amplitude de até 10 anos),"genero_apresentado":"feminino"|"masculino"|"indefinido","pessoas":int,' +
  '"texto_ou_marca_dagua":bool,"deformidade_visivel":bool,"conteudo_improprio":bool (nudez, sensualização, sangue, procedimento invasivo),"observacao":"uma frase"}'

export type Leitor = (url: string) => Promise<Laudo>

export function leitorClaude(): Leitor {
  return async (url: string) => {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('qa_indisponivel_sem_chave')
    const client = new Anthropic()
    const r = await client.messages.create({
      model: process.env.VERVE_FOTO_QA_MODEL ?? 'claude-haiku-5-5',
      max_tokens: 300,
      system: SISTEMA,
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'url', url } }, { type: 'text', text: 'Descreva a foto no formato pedido.' }] }],
    })
    const t = (r.content[0] as { type: string; text?: string }).text ?? ''
    const i = t.indexOf('{'), j = t.lastIndexOf('}')
    const laudo = i >= 0 && j > i ? validarLaudo(JSON.parse(t.slice(i, j + 1))) : null
    if (!laudo) throw new Error('qa_laudo_invalido')
    return laudo
  }
}

// Gera, confere e, se reprovar, refaz com correção. Devolve a URL aprovada ou '' (falha fechada). `log` recebe cada tentativa com o motivo.
export async function fotoConferida(params: {
  slide: number; persona: string; faixa: Faixa; instrucao?: string
  gerar: (instrucao?: string) => Promise<string>
  ler: Leitor
  log: QaEntrada[]
}): Promise<string> {
  let instrucao = params.instrucao
  for (let t = 1; t <= MAX_TENTATIVAS; t++) {
    let url = ''
    try { url = await params.gerar(instrucao) } catch { params.log.push({ slide: params.slide, tentativa: t, ok: false, falhas: [], acao: 'geracao_falhou' }); continue }
    let laudo: Laudo
    try { laudo = await params.ler(url) } catch (e) {
      params.log.push({ slide: params.slide, tentativa: t, ok: false, falhas: [], acao: 'leitura_falhou:' + String((e as Error).message).slice(0, 60) })
      continue   // sem laudo não aprova: tenta de novo e, esgotado, o slide falha (nunca passa sem conferir)
    }
    const r = avaliar(laudo, params.persona, params.faixa)
    if (r.ok) { params.log.push({ slide: params.slide, tentativa: t, ok: true, falhas: [] }); return url }
    const corr = correcaoPara(r.falhas, params.persona, params.faixa)
    params.log.push({ slide: params.slide, tentativa: t, ok: false, falhas: r.falhas, acao: t < MAX_TENTATIVAS ? 'refeita: ' + corr : 'esgotadas_as_tentativas' })
    instrucao = [params.instrucao, corr].filter(Boolean).join('; ')
  }
  return ''
}

export function resumoQa(log: QaEntrada[]): { refeitas: Array<{ slide: number; motivo: string }>; reprovadas: Array<{ slide: number; motivo: string }> } {
  const motivo = (e: QaEntrada) => e.falhas.map(f => f.motivo).join('; ') || e.acao || 'sem laudo'
  const porSlide = new Map<number, QaEntrada[]>()
  for (const e of log) porSlide.set(e.slide, [...(porSlide.get(e.slide) ?? []), e])
  const refeitas: Array<{ slide: number; motivo: string }> = [], reprovadas: Array<{ slide: number; motivo: string }> = []
  for (const [slide, es] of Array.from(porSlide.entries())) {
    const ultima = es[es.length - 1]
    const falhou = es.filter((e: QaEntrada) => !e.ok)
    if (falhou.length) (ultima.ok ? refeitas : reprovadas).push({ slide, motivo: motivo(falhou[0]) })
  }
  return { refeitas, reprovadas }
}
