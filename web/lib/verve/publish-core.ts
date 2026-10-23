// Regras puras da publicação automática do VERVE (testadas isoladas). Só decidem; quem publica é a rota, e só posts que o CEO autorizou (status 'aprovado').
import { safeEqual } from './admin-core'

export const ANTECEDENCIA_MS = 2 * 60 * 1000          // publica até 2 min antes do horário marcado
export const ATRASO_MAX_MS = 6 * 60 * 60 * 1000       // além de 6 h de atraso não publica sozinho: o CEO reagenda e autoriza de novo
export const MAX_POR_EXECUCAO = 5

export type Janela = 'cedo' | 'agora' | 'atrasado' | 'invalido'

export function classificar(scheduledAt: unknown, agora: Date): Janela {
  if (typeof scheduledAt !== 'string') return 'invalido'
  const t = Date.parse(scheduledAt)
  if (Number.isNaN(t)) return 'invalido'
  const dif = agora.getTime() - t
  if (dif < -ANTECEDENCIA_MS) return 'cedo'
  if (dif > ATRASO_MAX_MS) return 'atrasado'
  return 'agora'
}

// Token DEDICADO do agendador (VERVE_PUBLISH_TOKEN): só serve para disparar a publicação e consultar o estado do Instagram.
// Nunca é a chave de serviço do Supabase nem o token da Meta. Ausente ou curto demais (< 32) = recusado.
export function publishAuthorized(secret: string | undefined, headers: { get(name: string): string | null }): boolean {
  if (!secret || secret.length < 32) return false
  const auth = headers.get('authorization') ?? ''
  return auth.startsWith('Bearer ') && safeEqual(auth.slice(7), secret)
}

export interface PostPublicavel { tipo?: unknown; image_urls?: unknown }

// Pré-condições antes de reservar o post: o que falta aparece como erro claro, não como falha obscura da Meta.
export function problemaDoPost(post: PostPublicavel): string | null {
  const urls = Array.isArray(post.image_urls) ? post.image_urls : []
  if (!urls.length) return 'sem_imagem'
  if (!urls.every(u => typeof u === 'string' && /^https:\/\//.test(u))) return 'url_de_imagem_invalida'
  if (post.tipo === 'carrossel' && (urls.length < 2 || urls.length > 10)) return 'carrossel_precisa_de_2_a_10_imagens'
  if (post.tipo === 'carrossel' && !urls.every(u => /\.jpe?g(\?|$)/i.test(u as string))) return 'imagem_nao_e_jpeg'
  return null
}
