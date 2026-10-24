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

// Aceita o que o modelo devolve com tolerância de FORMA (número como texto, "true"/"false", gênero em outras palavras) e recusa só o que não dá para interpretar.
// O motivo da recusa diz QUAL campo falhou, para o aviso ao CEO ser diagnosticável.
const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v)
  return null
}
const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : v === 'true' ? true : v === 'false' ? false : null)
const genero = (v: unknown): Laudo['genero_apresentado'] | null => {
  const t = String(v ?? '').toLowerCase().trim()
  if (['feminino', 'feminina', 'mulher', 'female', 'woman'].includes(t)) return 'feminino'
  if (['masculino', 'masculina', 'homem', 'male', 'man'].includes(t)) return 'masculino'
  if (['indefinido', 'indeterminado', 'ambiguo', 'ambíguo', 'unknown', 'nao_identificavel'].includes(t)) return 'indefinido'
  return null
}

export function diagnosticarLaudo(x: unknown): { laudo: Laudo | null; campo?: string } {
  const o = x as Record<string, unknown>
  if (!o || typeof o !== 'object') return { laudo: null, campo: 'objeto' }
  const min = num(o.idade_aparente_min), max = num(o.idade_aparente_max), pessoas = num(o.pessoas)
  if (min === null) return { laudo: null, campo: 'idade_aparente_min' }
  if (max === null) return { laudo: null, campo: 'idade_aparente_max' }
  if (pessoas === null) return { laudo: null, campo: 'pessoas' }
  if (min < 0 || max > 120 || min > max) return { laudo: null, campo: 'faixa_de_idade' }
  const g = genero(o.genero_apresentado)
  if (!g) return { laudo: null, campo: 'genero_apresentado' }
  const t = bool(o.texto_ou_marca_dagua), d = bool(o.deformidade_visivel), i = bool(o.conteudo_improprio)
  if (t === null) return { laudo: null, campo: 'texto_ou_marca_dagua' }
  if (d === null) return { laudo: null, campo: 'deformidade_visivel' }
  if (i === null) return { laudo: null, campo: 'conteudo_improprio' }
  return { laudo: { idade_aparente_min: min, idade_aparente_max: max, genero_apresentado: g, pessoas, texto_ou_marca_dagua: t, deformidade_visivel: d, conteudo_improprio: i, observacao: typeof o.observacao === 'string' ? o.observacao.slice(0, 200) : '' } }
}

export function validarLaudo(x: unknown): Laudo | null {
  return diagnosticarLaudo(x).laudo
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
  'Idade aparente é uma estimativa visual aproximada, sempre preenchida (faixa de até 10 anos), mesmo com incerteza. Registre o resultado SOMENTE chamando a ferramenta registrar_laudo.'

const FERRAMENTA = {
  name: 'registrar_laudo',
  description: 'Registra o laudo visual da foto.',
  input_schema: {
    type: 'object' as const,
    properties: {
      idade_aparente_min: { type: 'integer', description: 'idade aparente mínima da pessoa principal' },
      idade_aparente_max: { type: 'integer', description: 'idade aparente máxima (no máximo 10 anos acima da mínima)' },
      genero_apresentado: { type: 'string', enum: ['feminino', 'masculino', 'indefinido'] },
      pessoas: { type: 'integer', description: 'quantas pessoas aparecem' },
      texto_ou_marca_dagua: { type: 'boolean', description: 'há texto, letras, logotipo ou marca d\u2019água' },
      deformidade_visivel: { type: 'boolean', description: 'mãos, rosto ou anatomia deformados' },
      conteudo_improprio: { type: 'boolean', description: 'nudez, sensualização, sangue ou procedimento invasivo' },
      observacao: { type: 'string', description: 'uma frase' },
    },
    required: ['idade_aparente_min', 'idade_aparente_max', 'genero_apresentado', 'pessoas', 'texto_ou_marca_dagua', 'deformidade_visivel', 'conteudo_improprio'],
  },
}

export type Leitor = (url: string) => Promise<Laudo>
export interface ClienteMensagens { messages: { create: (args: any) => Promise<{ content: Array<{ type: string; input?: unknown; text?: string }> }> } }

// A resposta vem pela FERRAMENTA (estrutura garantida pelo esquema), não por texto livre: acaba o JSON solto, em bloco de código ou com recusa em prosa.
export function leitorClaude(cliente?: ClienteMensagens): Leitor {
  return async (url: string) => {
    if (!cliente && !process.env.ANTHROPIC_API_KEY) throw new Error('qa_indisponivel_sem_chave')
    const client = cliente ?? (new Anthropic() as unknown as ClienteMensagens)
    const r = await client.messages.create({
      model: process.env.VERVE_FOTO_QA_MODEL ?? 'claude-haiku-5-5',
      max_tokens: 400,
      system: SISTEMA,
      tools: [FERRAMENTA],
      tool_choice: { type: 'tool', name: FERRAMENTA.name },
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'url', url } }, { type: 'text', text: 'Registre o laudo desta foto.' }] }],
    })
    const uso = r.content.find(b => b.type === 'tool_use')
    if (!uso) throw new Error('qa_sem_laudo:' + String(r.content.find(b => b.type === 'text')?.text ?? 'sem_texto').replace(/\s+/g, ' ').slice(0, 60))
    const d = diagnosticarLaudo(uso.input)
    if (!d.laudo) throw new Error('qa_laudo_invalido:' + (d.campo ?? '?'))
    return d.laudo
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
