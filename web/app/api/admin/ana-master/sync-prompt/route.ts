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

// POST — proxy para o VM que força a migração do prompt no Supabase
export async function POST(_req: NextRequest) {
  const ANA_MASTER_URL = process.env.ANA_MASTER_URL ?? 'http://localhost:3001'
  try {
    const vmRes = await fetch(`${ANA_MASTER_URL}/sync-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    const vmData = await vmRes.json()
    return NextResponse.json(vmData, { status: vmRes.status })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: `VM inacessível: ${e.message}` }, { status: 502 })
  }
}
