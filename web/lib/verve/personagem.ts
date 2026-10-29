// PERSONAGEM do carrossel: a MESMA pessoa em todos os slides (consistência), bonita, saudável e convincente (conversão), na idade do público do briefing.
// Padrão do CEO (24/10): nada de rostos duros ou envelhecidos demais, nada de cenas de sofrimento; mulher brasileira elegante e acolhedora que o público quer ser/confiar.
import type { Faixa } from './persona'

// Uma idade só por carrossel (não espalhada pela faixa): 48 para 40 a 60. Fica na parte de baixo da faixa para o rosto não parecer envelhecido demais.
export function idadeDoPersonagem(faixa: Faixa): number {
  return Math.round(faixa.min + (faixa.max - faixa.min) * 0.4)
}

export function descricaoPersonagem(persona: string, faixa: Faixa): string {
  const idade = idadeDoPersonagem(faixa)
  if (persona === 'homem_40_60') {
    return `a handsome distinguished Brazilian man aged ${idade}, fit and healthy, short salt-and-pepper hair, light stubble, warm confident kind expression, well-groomed, elegant casual clothes, looks great for his age`
  }
  return `a beautiful Brazilian woman aged ${idade}, radiant healthy glowing skin with only subtle natural expression lines, dark brown shoulder-length wavy hair with a few silver highlights, warm confident kind expression, tasteful minimal makeup, elegant simple clothes, graceful and aspirational, looks great for her age`
}

export const ESTILO = 'composition: the whole head fully in frame with generous headroom above the hair, chin above the middle of the picture, shoulders visible, calm empty lower third left free for text, premium editorial portrait photography, soft flattering natural light, warm tones, shallow depth of field, hopeful and empowered mood, photorealistic, ultra detailed, 4:5 portrait, no text, no watermark'

// Roteiro visual: cenas dignidade-primeiro, em sequência (abertura -> miolo -> consulta). Cada tema do briefing escolhe uma cena favorável, nunca de exaustão ou sofrimento.
export function cenaDoSlide(indice: number, total: number, tema: string, persona: string): string {
  const ele = persona === 'homem_40_60'
  if (indice === 0) return 'close-up hero portrait looking at the camera with a gentle confident smile'
  if (indice === total - 1) return `${ele ? 'he' : 'she'} sitting in a bright welcoming doctor's consultation room, smiling reassured, a doctor partially visible, warm atmosphere`
  const t = tema.toLowerCase()
  if (/cansa[çc]o|fadiga|energia|disposi[çc][aã]o/.test(t)) return 'pausing by a sunlit window with a cup of tea, calm and thoughtful, medium shot'
  if (/libido|desejo|sexual/.test(t)) return 'a warm modest moment, gentle smile, looking softly to the side, medium close-up'
  if (/gordura|peso|corpo|composi[çc][aã]o/.test(t)) return 'looking at the mirror with a calm confident expression, elegant casual clothes, medium shot'
  if (/irritabilidade|humor|estresse|ansiedade/.test(t)) return 'taking a deep breath on a sunlit balcony, composed and serene, medium shot'
  if (/sono|inso[mô]nia|dormir/.test(t)) return 'resting peacefully on white linen in soft morning light, serene, close-up'
  if (/exame|diagn[oó]stico|laborat[oó]rio|avalia[çc][aã]o|m[eé]dic/.test(t)) return 'calmly reviewing a document with a doctor, relaxed and attentive, medium shot'
  if (/andropausa/.test(t)) return 'walking outdoors in golden light, reflective and confident, medium shot'
  return 'walking in a sunlit garden, serene and contemplative, medium shot'
}

const PILAR: Record<string, string> = {
  familia: 'warm home environment, intimate soft tones',
  autoridade: 'clean elegant neutral background, refined professional lighting',
  lifestyle: 'golden hour outdoors, cinematic warm light',
}

export function promptDoSlide(p: { persona: string; faixa: Faixa; indice: number; total: number; tema: string; pilar: string; instrucao?: string }): string {
  const extra = p.instrucao ? `, art direction: ${p.instrucao}` : ''
  return `${descricaoPersonagem(p.persona, p.faixa)}, ${cenaDoSlide(p.indice, p.total, p.tema, p.persona)}, ${PILAR[p.pilar] ?? 'elegant natural setting'}${extra}, ${ESTILO}`
}

// Slides 2..n partem da foto de abertura: o modelo de edição por referência mantém o rosto, o cabelo e a idade.
export function promptComReferencia(p: { persona: string; indice: number; total: number; tema: string; instrucao?: string }): string {
  const quem = p.persona === 'homem_40_60' ? 'man' : 'woman'
  const extra = p.instrucao ? `, art direction: ${p.instrucao}` : ''
  return `The exact same ${quem} as in the reference photo (identical face, hair, skin and age), now ${cenaDoSlide(p.indice, p.total, p.tema, p.persona)}${extra}, keep her/him beautiful, radiant and elegant, ${ESTILO}`
}

// Semente estável por post: a mesma semente em todas as gerações de texto ajuda a manter a aparência quando a referência não está disponível.
export function sementeDoPost(postId: string): number {
  let h = 2166136261
  for (const c of postId) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) }
  return Math.abs(h) % 2147483647
}
