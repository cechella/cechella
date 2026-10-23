import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { publishAuthorized } from '@/lib/verve/publish-core'
import { renderPost } from '@/lib/verve/render-post'
import { validarPedido, escolherAlvo, STATUS_REFAZ } from '@/lib/verve/refoto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST /api/admin/verve/refoto  { id?, faixa?: {min,max}, persona?, instrucao? }
// CORREÇÃO DE FOTOS autônoma: o CEO diz ao Gustavo que as fotos estão erradas; o ATLAS traduz o pedido e chama esta rota, que REFAZ as imagens do carrossel
// (sem id: o mais recente ainda não publicado). O post volta para "aguardando": trocar a imagem invalida autorização anterior, e o CEO só vê e autoriza de novo.
// Se a geração falhar, as imagens antigas ficam como estavam. Acesso: token do agendador (VERVE_PUBLISH_TOKEN) ou administrador logado.
export async function POST(req: NextRequest) {
  if (!publishAuthorized(process.env.VERVE_PUBLISH_TOKEN, req.headers)) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
  }
  const body = await req.json().catch(() => ({}))
  const pedido = validarPedido(body)
  if (!pedido.ok) return NextResponse.json({ ok: false, erro: pedido.erro }, { status: 400 })
  let id = pedido.id
  if (!id) {
    const { data } = await supabase.from('verve_posts').select('id,status,tipo,created_at').in('status', STATUS_REFAZ).eq('tipo', 'carrossel').order('created_at', { ascending: false }).limit(10)
    id = escolherAlvo(data ?? []) ?? undefined
    if (!id) return NextResponse.json({ ok: false, erro: 'nenhum_carrossel_para_refazer' }, { status: 404 })
  }
  const r = await renderPost(supabase, id, pedido.opcoes)
  if (!r.ok) return NextResponse.json({ ...r }, { status: r.status })
  return NextResponse.json({ ok: true, id, imagens: r.imagens, persona: r.persona, faixa: r.faixa, status: 'aguardando' })
}
