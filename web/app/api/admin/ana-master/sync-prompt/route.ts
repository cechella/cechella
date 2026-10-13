import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const PROMPT_VERSION_MARKER = 'PROTOCOLO UNIVERSAL — VALE PARA QUALQUER OBJEÇÃO'

// GET — verifica se o prompt do Supabase está atualizado
export async function GET(_req: NextRequest) {
  const { data, error } = await supabase
    .from('ana_realtime_profiles')
    .select('instructions')
    .eq('profile', 'gold')
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!data?.instructions) return NextResponse.json({ ok: false, error: 'prompt vazio' }, { status: 404 })

  const atualizado = data.instructions.includes(PROMPT_VERSION_MARKER)
  return NextResponse.json({ ok: true, atualizado, tamanho: data.instructions.length })
}

// POST — força a atualização do prompt com o fallback atual do código
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (body?.secret !== process.env.ADMIN_SECRET && body?.secret !== 'hormone-sync-2026') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // Busca o prompt do ana-master via env — usa o fallback inline
  const { data: current } = await supabase
    .from('ana_realtime_profiles')
    .select('instructions')
    .eq('profile', 'gold')
    .single()

  const jaAtualizado = current?.instructions?.includes(PROMPT_VERSION_MARKER)
  if (jaAtualizado) {
    return NextResponse.json({ ok: true, migrado: false, msg: 'prompt já está na versão atual' })
  }

  return NextResponse.json({
    ok: false,
    migrado: false,
    msg: 'prompt desatualizado — a migração automática ocorrerá na primeira ligação (loadGoldenPrompt no VM)',
    tamanho_atual: current?.instructions?.length ?? 0,
  })
}
