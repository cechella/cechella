import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { publishAuthorized } from '@/lib/verve/publish-core'
import { avaliarAprovacao } from '@/lib/verve/aprovacao'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST /api/admin/verve/aprovar  { id, quando?: 'agora' | ISO, autorizado_por: 'ceo_whatsapp', confirmacao: '<código curto da confirmação do CEO>' }
// O Gustavo (ATLAS) executa a AUTORIZAÇÃO QUE O CEO JÁ DEU no WhatsApp (pedido + botão "Sim"). Esta rota nunca decide sozinha: refaz as travas no servidor
// (status, imagens, legenda, assinatura do médico, filtro de publicidade médica, horário, limite diário) e só então marca 'aprovado'. Quem publica continua sendo o agendador /publish.
// Acesso SOMENTE pelo token do agendador (VERVE_PUBLISH_TOKEN); sem sessão de administrador.
export async function POST(req: NextRequest) {
  if (!publishAuthorized(process.env.VERVE_PUBLISH_TOKEN, req.headers)) return NextResponse.json({ error: 'nao_autorizado' }, { status: 401 })
  let body: { id?: unknown; quando?: unknown; autorizado_por?: unknown; confirmacao?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'json_invalido' }, { status: 400 }) }
  const id = typeof body.id === 'string' ? body.id.trim() : ''
  const conf = typeof body.confirmacao === 'string' ? body.confirmacao.trim() : ''
  if (!id || body.autorizado_por !== 'ceo_whatsapp' || conf.length < 4 || conf.length > 40) return NextResponse.json({ error: 'pedido_incompleto' }, { status: 400 })

  const { data: post } = await supabase.from('verve_posts').select('*').eq('id', id).single()
  if (!post) return NextResponse.json({ error: 'post_nao_encontrado' }, { status: 404 })

  const agora = new Date()
  const inicioDia = new Date(agora.getTime() - 3 * 3600_000); inicioDia.setUTCHours(0, 0, 0, 0)   // dia de Brasília (UTC-3), em UTC
  const desde = new Date(inicioDia.getTime() + 3 * 3600_000).toISOString()
  const { count } = await supabase.from('verve_posts').select('id', { count: 'exact', head: true })
    .in('status', ['aprovado', 'publicando', 'publicado']).gte('updated_at', desde)

  const d = avaliarAprovacao(post, body.quando, agora, count ?? 0, post.scheduled_at)
  if (!d.ok) return NextResponse.json({ error: 'travas_do_servidor', problemas: d.problemas }, { status: 422 })

  const { data, error } = await supabase.from('verve_posts')
    .update({ status: 'aprovado', scheduled_at: d.scheduled_at, error_msg: null, updated_at: agora.toISOString() })
    .eq('id', id).in('status', ['rascunho', 'aguardando']).select('id,titulo,status,scheduled_at').single()
  if (error || !data) return NextResponse.json({ error: 'nao_foi_possivel_aprovar' }, { status: 409 })
  console.log(JSON.stringify({ evento: 'verve_aprovado_a_pedido_do_ceo', id, confirmacao: conf, scheduled_at: d.scheduled_at }))
  return NextResponse.json({ ok: true, post: data })
}
