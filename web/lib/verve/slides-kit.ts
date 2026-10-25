// Slides com PAPEL editorial (capa, conteúdo, comparação, checklist, fecho). Validação pura: limites que mantêm o texto legível no celular, sem estouro de layout.
export type PapelEditorial = 'capa' | 'conteudo' | 'comparacao' | 'checklist' | 'fecho'

export interface SlideKit {
  titulo: string
  texto?: string
  papel?: PapelEditorial
  itens?: string[]                                   // checklist: 2 a 4 itens
  colunas?: [{ titulo: string; texto: string }, { titulo: string; texto: string }]   // comparação: 2 colunas
}

export const LIMITES = { titulo: 80, texto: 230, item: 46, colunaTitulo: 22, colunaTexto: 120, itensMin: 2, itensMax: 4 } as const
const PAPEIS: PapelEditorial[] = ['capa', 'conteudo', 'comparacao', 'checklist', 'fecho']

export function validarSlides(slides: unknown): { ok: true; slides: SlideKit[] } | { ok: false; erros: string[] } {
  if (!Array.isArray(slides) || slides.length < 2 || slides.length > 10) return { ok: false, erros: ['slides_2_a_10'] }
  const erros: string[] = []
  const out: SlideKit[] = []
  slides.forEach((x, i) => {
    const n = i + 1
    const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>
    const titulo = typeof o.titulo === 'string' ? o.titulo.trim() : ''
    if (!titulo || titulo.length > LIMITES.titulo) erros.push(`slide${n}:titulo_1_a_${LIMITES.titulo}`)
    const texto = typeof o.texto === 'string' ? o.texto.trim() : undefined
    if (texto && texto.length > LIMITES.texto) erros.push(`slide${n}:texto_max_${LIMITES.texto}`)
    const papel = (o.papel === undefined ? undefined : PAPEIS.includes(o.papel as PapelEditorial) ? (o.papel as PapelEditorial) : null)
    if (papel === null) erros.push(`slide${n}:papel_invalido`)
    const s: SlideKit = { titulo, ...(texto ? { texto } : {}), ...(papel ? { papel } : {}) }
    if (papel === 'checklist') {
      const itens = Array.isArray(o.itens) ? o.itens.filter((t): t is string => typeof t === 'string' && !!t.trim()).map(t => t.trim()) : []
      if (itens.length < LIMITES.itensMin || itens.length > LIMITES.itensMax) erros.push(`slide${n}:checklist_${LIMITES.itensMin}_a_${LIMITES.itensMax}_itens`)
      else if (itens.some(t => t.length > LIMITES.item)) erros.push(`slide${n}:item_max_${LIMITES.item}`)
      else s.itens = itens
    }
    if (papel === 'comparacao') {
      const c = Array.isArray(o.colunas) ? o.colunas : []
      const ok = c.length === 2 && c.every(k => k && typeof k.titulo === 'string' && k.titulo.trim() && k.titulo.length <= LIMITES.colunaTitulo && typeof k.texto === 'string' && k.texto.trim() && k.texto.length <= LIMITES.colunaTexto)
      if (!ok) erros.push(`slide${n}:comparacao_2_colunas_titulo_${LIMITES.colunaTitulo}_texto_${LIMITES.colunaTexto}`)
      else s.colunas = [{ titulo: c[0].titulo.trim(), texto: c[0].texto.trim() }, { titulo: c[1].titulo.trim(), texto: c[1].texto.trim() }]
    }
    out.push(s)
  })
  if (out[0] && out[0].papel && out[0].papel !== 'capa') erros.push('slide1:papel_deve_ser_capa')
  const ult = out[out.length - 1]
  if (ult?.papel && ult.papel !== 'fecho') erros.push('ultimo_slide:papel_deve_ser_fecho')
  return erros.length ? { ok: false, erros } : { ok: true, slides: out }
}
