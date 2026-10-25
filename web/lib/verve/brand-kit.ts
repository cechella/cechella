// KIT DE MARCA do Dr. Vinícius / Hormone Ecosystem: o que torna todo carrossel reconhecível de longe (aprendizado com referências: identidade fixa em todos os slides,
// capa com convite a deslizar, texto grande sobre bloco liso e fecho que pede salvar e enviar). A arte e as fotos são nossas; da referência só se aproveita o PRINCÍPIO.
export const KIT = {
  nome: 'kit-v1',
  cores: {
    painel: 'rgba(26,21,18,0.84)',   // bloco de texto: marrom quase preto, quente
    painelBorda: 'rgba(201,169,110,0.45)',
    destaque: '#C9A96E',              // champanhe: linha, selo e seta
    texto: '#F7F2EA',
    textoSuave: 'rgba(247,242,234,0.82)',
    chipFundo: '#C9A96E',
    chipTexto: '#1A1512',
  },
  painelRaio: 44,
  margem: 52,
  fonteTitulo: 'Fraunces',
  fonteTexto: 'Instrument Sans',
} as const

export type PapelSlide = 'capa' | 'conteudo' | 'fecho'

export function papelDoSlide(slideNum: number, totalSlides: number, isCta?: boolean): PapelSlide {
  if (isCta || (totalSlides > 1 && slideNum === totalSlides)) return 'fecho'
  return slideNum === 1 ? 'capa' : 'conteudo'
}

// Tamanhos que mantêm o texto legível no celular: título e descrição encolhem só quando o texto é longo, nunca abaixo do mínimo.
export function tamanhosDeTexto(titulo: string, descricao?: string): { titulo: number; descricao: number } {
  const t = titulo.length
  const d = (descricao ?? '').length
  return { titulo: t > 70 ? 50 : t > 45 ? 56 : 64, descricao: d > 200 ? 31 : d > 130 ? 34 : 38 }
}

// Chips do último slide: pedem a interação que mais pesa no alcance (salvar e enviar) sem prometer resultado de saúde.
export const CHIPS_FECHO = ['SALVE PARA RELER', 'ENVIE A QUEM PRECISA']

const svgUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
export const SETA_DESLIZE = svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="36" viewBox="0 0 120 36"><line x1="4" y1="18" x2="112" y2="18" stroke="#C9A96E" stroke-width="4" stroke-linecap="round"/><polyline points="96,4 112,18 96,32" fill="none" stroke="#C9A96E" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`)
