import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export interface AbExperimento {
  experimento: string
  variant_b: Record<string, unknown>
}

// Cache em memória por 5 minutos para não bater no DB a cada chamada
let cache: { data: AbExperimento | null; ts: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

export async function getAbExperimento(): Promise<AbExperimento | null> {
  const now = Date.now()
  if (cache && now - cache.ts < CACHE_TTL) return cache.data

  const { data } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', 'ab_experimento_ativo')
    .maybeSingle()

  const result = (data?.valor as AbExperimento) ?? null
  cache = { data: result, ts: now }
  return result
}

// Determinístico: mesmo telefone sempre cai no mesmo grupo
export function sortearVariant(telefone: string): 'A' | 'B' {
  let hash = 0
  for (let i = 0; i < telefone.length; i++) {
    hash = (hash * 31 + telefone.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash) % 2 === 0 ? 'A' : 'B'
}

export async function registrarAbTest(params: {
  lead_telefone: string
  experimento: string
  variant: 'A' | 'B'
}) {
  await supabase.from('ab_tests').insert({
    lead_telefone: params.lead_telefone,
    experimento: params.experimento,
    variant: params.variant,
  })
}
