import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { renderPostRascunho } from '@/lib/verve/render-post'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST /api/admin/verve/posts/render  { id }  — gera (ou refaz) as imagens de UM carrossel em rascunho. Só administrador logado.
// Só mexe em imagens: o post vai para "aguardando" e a autorização continua sendo do CEO.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response
  const body = await req.json().catch(() => ({}))
  const id = typeof body?.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id_obrigatorio' }, { status: 400 })
  const r = await renderPostRascunho(supabase, id)
  return r.ok ? NextResponse.json(r) : NextResponse.json({ ...r, error: r.erro }, { status: r.status })
}
