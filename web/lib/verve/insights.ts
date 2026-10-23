// Leitura de desempenho do Instagram para o diretor de mídia. Funções puras (testadas isoladas): a rota só faz as chamadas HTTP.
// Regra do projeto: número desconhecido é null + motivo, NUNCA zero (zero é um número).
export interface Metrica { valor: number | null; erro?: string }

// Métricas por mídia. Cada uma é pedida separadamente: se a Meta recusar uma, as outras continuam valendo.
// 'views' substituiu impressions/plays (changelog Graph API v22, 21/04/2025); 'impressions' não é mais pedida.
export const METRICAS_MIDIA = ['reach', 'views', 'saved', 'shares', 'total_interactions', 'likes', 'comments'] as const
export const METRICAS_CONTA = ['reach', 'views', 'profile_views', 'accounts_engaged'] as const

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function valorMetrica(resp: unknown): Metrica {
  if (!isObj(resp)) return { valor: null, erro: 'resposta_invalida' }
  if (isObj(resp.error)) return { valor: null, erro: String(resp.error.message ?? 'erro_da_meta').slice(0, 160) }
  const item = Array.isArray(resp.data) ? resp.data[0] : undefined
  if (!isObj(item)) return { valor: null, erro: 'metrica_ausente' }
  const tv = item.total_value
  if (isObj(tv) && typeof tv.value === 'number') return { valor: tv.value }
  const vals = item.values
  if (Array.isArray(vals) && isObj(vals[0]) && typeof vals[0].value === 'number') return { valor: vals[0].value }
  return { valor: null, erro: 'sem_valor' }
}

export interface MidiaBruta { id?: string; caption?: string; media_type?: string; media_product_type?: string; permalink?: string; timestamp?: string; like_count?: number; comments_count?: number }

// Resumo seguro de uma mídia: legenda só no começo (o ATLAS não precisa do texto inteiro), contagens nulas quando a Meta não devolve.
export function resumirMidia(m: MidiaBruta, metricas: Record<string, Metrica>, post?: { id: string; titulo?: string; pilar?: string; tipo?: string } | null) {
  const num = (v: unknown) => (typeof v === 'number' ? v : null)
  return {
    id: String(m.id ?? ''),
    permalink: m.permalink ?? null,
    tipo: m.media_product_type ?? m.media_type ?? null,
    publicado_em: m.timestamp ?? null,
    legenda_inicio: String(m.caption ?? '').replace(/\s+/g, ' ').slice(0, 160),
    curtidas: num(m.like_count),
    comentarios: num(m.comments_count),
    metricas,
    post: post ? { id: post.id, titulo: post.titulo ?? null, pilar: post.pilar ?? null, tipo: post.tipo ?? null } : null,
  }
}

// Diagnóstico de permissão: separa "não consegui LER" de "a Meta não libera INSIGHTS".
export function diagnostico(perfilOk: boolean, metricas: Metrica[]): { leitura_ok: boolean; insights_ok: boolean; metricas_ok: number; metricas_total: number; erros: string[] } {
  const ok = metricas.filter(m => m.valor !== null).length
  const erros = Array.from(new Set(metricas.map(m => m.erro).filter((e): e is string => !!e))).slice(0, 5)
  return { leitura_ok: perfilOk, insights_ok: ok > 0, metricas_ok: ok, metricas_total: metricas.length, erros }
}
