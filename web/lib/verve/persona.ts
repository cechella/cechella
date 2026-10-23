// Público do conteúdo (define o rosto das fotos e o badge do slide 1). Case-insensitive e com plural: "Homens" também conta.
export type Persona = 'homem_40_60' | 'mulher_35_50'

const MASCULINO = /\bhomem\b|\bhomens\b|\bmasculin\w+|\bandropausa\b|\btestosterona\b|\bpai\b|\bpais\b/

export function detectPersona(publico_alvo?: string, titulo?: string, objetivo?: string): Persona {
  const texto = [publico_alvo, titulo, objetivo].join(' ').toLowerCase()
  return MASCULINO.test(texto) ? 'homem_40_60' : 'mulher_35_50'
}
