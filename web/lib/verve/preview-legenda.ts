// O que o público vê no Instagram, calculado só com o que SERÁ publicado (a legenda gravada no post e as imagens do carrossel). Regras puras, testadas isoladas.
export const LIMITE_FEED = 125          // no feed o Instagram mostra só o começo da legenda e "… mais" (aproximadamente 125 caracteres)
export const LIMITE_LEGENDA = 2200      // o Instagram recusa legenda maior
export const LIMITE_HASHTAGS = 30       // acima disso o Instagram recusa a publicação

export function legendaRecolhida(legenda: string, limite = LIMITE_FEED): { visivel: string; cortou: boolean } {
  const t = String(legenda ?? '').replace(/\r/g, '')
  if (t.length <= limite) return { visivel: t, cortou: false }
  // quebra de linha antes do limite: o feed mostra só até ali (aproximação do comportamento do app)
  const quebra = t.indexOf('\n')
  if (quebra > 0 && quebra <= limite && t.slice(quebra).trim()) return { visivel: t.slice(0, quebra).trimEnd(), cortou: true }
  const corte = t.slice(0, limite)
  const ult = corte.lastIndexOf(' ')
  return { visivel: (ult > limite * 0.6 ? corte.slice(0, ult) : corte).trimEnd(), cortou: true }
}

export function contarHashtags(legenda: string): number {
  return (String(legenda ?? '').match(/#[A-Za-z0-9_\u00C0-\u024F]+/g) ?? []).length
}

export interface ResumoPreview { slides: number; caracteres: number; hashtags: number; avisos: string[] }

// Avisos de fidelidade: tudo o que faria o post sair diferente do que o CEO imagina ou ser recusado pelo Instagram.
export function resumoPreview(p: { image_urls?: unknown; legenda?: unknown; tipo?: unknown }): ResumoPreview {
  const imgs = Array.isArray(p.image_urls) ? p.image_urls.filter((u): u is string => typeof u === 'string' && !!u) : []
  const legenda = typeof p.legenda === 'string' ? p.legenda : ''
  const caracteres = legenda.length
  const hashtags = contarHashtags(legenda)
  const avisos: string[] = []
  if (!legenda.trim()) avisos.push('Este post está SEM legenda: será publicado sem texto nenhum.')
  if (caracteres > LIMITE_LEGENDA) avisos.push(`A legenda tem ${caracteres} caracteres e o Instagram aceita no máximo ${LIMITE_LEGENDA}: a publicação seria recusada.`)
  if (hashtags > LIMITE_HASHTAGS) avisos.push(`Há ${hashtags} hashtags e o Instagram aceita no máximo ${LIMITE_HASHTAGS}.`)
  if (p.tipo === 'carrossel' && (imgs.length < 2 || imgs.length > 10)) avisos.push(`Carrossel precisa de 2 a 10 imagens (este tem ${imgs.length}).`)
  return { slides: imgs.length, caracteres, hashtags, avisos }
}
