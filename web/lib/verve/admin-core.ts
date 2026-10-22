// Decisão de acesso do VERVE: só administrador autenticado. Sem imports de framework, para poder ser testada isolada.
export type AdminDecision =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403; error: 'unauthorized' | 'forbidden' }

export interface AdminDeps {
  getUserId: () => Promise<string | null>
  getRole: (userId: string) => Promise<string | null>
}

export async function decideAdmin(deps: AdminDeps): Promise<AdminDecision> {
  let userId: string | null = null
  try {
    userId = await deps.getUserId()
  } catch {
    userId = null
  }
  if (!userId) return { ok: false, status: 401, error: 'unauthorized' }
  let role: string | null = null
  try {
    role = await deps.getRole(userId)
  } catch {
    role = null
  }
  // Fecha por padrão: erro ao ler o perfil, perfil ausente ou qualquer papel diferente de admin = recusado.
  if (role !== 'admin') return { ok: false, status: 403, error: 'forbidden' }
  return { ok: true, userId }
}

// Segredo do cron: precisa existir e bater (cabeçalho x-cron-secret ou Authorization: Bearer). Sem segredo configurado, nada passa.
export function cronAuthorized(secret: string | undefined, headers: { get(name: string): string | null }): boolean {
  if (!secret) return false
  return headers.get('x-cron-secret') === secret || headers.get('authorization') === `Bearer ${secret}`
}

// Comparação em tempo constante (o token do ATLAS não pode vazar por diferença de tempo).
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

// Token DEDICADO do ATLAS (VERVE_ATLAS_TOKEN): só vale nas rotas que o contrato lista (criar proposta de briefing, ler status do briefing, ler métricas).
// Nunca é a chave de serviço do Supabase. Token ausente ou curto demais (< 32 caracteres) = recusado.
export function atlasAuthorized(secret: string | undefined, headers: { get(name: string): string | null }): boolean {
  if (!secret || secret.length < 32) return false
  const auth = headers.get('authorization') ?? ''
  return auth.startsWith('Bearer ') && safeEqual(auth.slice(7), secret)
}
