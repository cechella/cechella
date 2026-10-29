// Público do conteúdo (define o rosto das fotos e o badge do slide 1). Case-insensitive e com plural: "Homens" também conta.
export type Persona = 'homem_40_60' | 'mulher_35_50'

const MASCULINO = /\bhomem\b|\bhomens\b|\bmasculin\w+|\bandropausa\b|\btestosterona\b|\bpai\b|\bpais\b/

export function detectPersona(publico_alvo?: string, titulo?: string, objetivo?: string): Persona {
  const texto = [publico_alvo, titulo, objetivo].join(' ').toLowerCase()
  return MASCULINO.test(texto) ? 'homem_40_60' : 'mulher_35_50'
}

// Faixa etária do público, tirada do briefing do CEO ("40 a 60 anos"). Sem faixa no texto, usa a padrão (40 a 60).
export interface Faixa { min: number; max: number }
export const FAIXA_PADRAO: Faixa = { min: 40, max: 60 }

export function detectFaixa(...textos: Array<string | undefined>): Faixa {
  const t = textos.join(' ').toLowerCase()
  const m = t.match(/(\d{2})\s*(?:a|à|até|-|–|—|e)\s*(\d{2})\s*anos/)
  if (m) {
    const min = Number(m[1]); const max = Number(m[2])
    if (min >= 30 && max <= 80 && min < max) return { min, max }
  }
  return FAIXA_PADRAO
}

// Idade-alvo de cada slide, espalhada pela faixa (determinística): o carrossel mostra mulheres/homens de idades diferentes dentro do público.
export function idadeDoSlide(faixa: Faixa, indice: number): number {
  const passos = [0.5, 1, 0.25, 0.75, 0]
  return Math.round(faixa.min + (faixa.max - faixa.min) * passos[indice % passos.length])
}
