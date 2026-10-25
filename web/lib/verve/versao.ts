// Revisão editorial: a VERSÃO B de um post nasce ao lado do original (o original nunca é alterado) com texto, papéis de slide e legenda novos.
// Regras puras e testadas: validação do pedido, defesa de compliance (além da do Pablo no ATLAS) e limite diário de versões por post.
import { complianceViolations, comAssinatura } from './compliance'
import { validarSlides, type SlideKit } from './slides-kit'

export const MAX_VERSOES_POR_DIA = 3
export const SUFIXO_VERSAO = ' · versão B'

export type PedidoVersao =
  | { ok: true; id_original: string; titulo?: string; legenda: string; slides: SlideKit[]; motivo?: string }
  | { ok: false; erro: string; detalhes?: string[] }

export function validarPedidoVersao(body: unknown): PedidoVersao {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  if (typeof b.id_original !== 'string' || !b.id_original.trim()) return { ok: false, erro: 'id_original_obrigatorio' }
  if (typeof b.legenda !== 'string' || !b.legenda.trim()) return { ok: false, erro: 'legenda_obrigatoria' }
  if (b.legenda.length > 2000) return { ok: false, erro: 'legenda_longa_demais' }
  const sl = validarSlides(b.slides)
  if (!sl.ok) return { ok: false, erro: 'slides_invalidos', detalhes: sl.erros }
  const texto = [b.titulo, b.legenda, ...sl.slides.flatMap(s => [s.titulo, s.texto, ...(s.itens ?? []), ...(s.colunas ?? []).flatMap(c => [c.titulo, c.texto])])].filter((x): x is string => typeof x === 'string').join('\n')
  const viol = complianceViolations(texto)
  if (viol.length) return { ok: false, erro: 'reprovado_pelo_filtro_de_publicidade_medica', detalhes: viol }
  const titulo = typeof b.titulo === 'string' && b.titulo.trim() ? b.titulo.trim().slice(0, 120) : undefined
  return { ok: true, id_original: b.id_original.trim(), titulo, legenda: comAssinatura(b.legenda), slides: sl.slides, motivo: typeof b.motivo === 'string' ? b.motivo.slice(0, 400) : undefined }
}

export function tituloDaVersao(tituloOriginal: string, tituloNovo?: string): string {
  const base = (tituloNovo ?? tituloOriginal).replace(/ · versão B$/, '')
  return `${base}${SUFIXO_VERSAO}`.slice(0, 140)
}

export function podeCriarVersao(versoesHoje: number): boolean {
  return versoesHoje < MAX_VERSOES_POR_DIA
}
