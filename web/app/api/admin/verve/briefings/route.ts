import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { atlasAuthorized } from '@/lib/verve/admin-core'
import { validateBriefingInput } from '@/lib/verve/briefing-input'
import { COMPLIANCE_RULES_PT, complianceViolations } from '@/lib/verve/compliance'
import { renderCarrossel } from '@/lib/verve/render-slide'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const MAX_BODY = 64 * 1024

// GET /api/admin/verve/briefings — lista (só administrador logado; o ATLAS lê o status de UM briefing com ?id=)
export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get('id')
  if (id && atlasAuthorized(process.env.VERVE_ATLAS_TOKEN, req.headers)) {
    const { data, error } = await supabase.from('verve_briefings').select('id,status').eq('id', id).single()
    if (error) return NextResponse.json({ error: 'nao_encontrado' }, { status: 404 })
    return NextResponse.json({ id: data.id, status: data.status })
  }
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response
  const { data, error } = await supabase
    .from('verve_briefings')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ briefings: data })
}

// POST /api/admin/verve/briefings — proposta do Gustavo. Token DEDICADO do ATLAS (VERVE_ATLAS_TOKEN) ou administrador logado.
// A chave de serviço do Supabase NÃO vale aqui: ela dá acesso total ao banco e não pode sair da Hormone.
export async function POST(req: NextRequest) {
  const viaAtlas = atlasAuthorized(process.env.VERVE_ATLAS_TOKEN, req.headers)
  if (!viaAtlas) {
    const auth = await requireAdmin(req)
    if (!auth.ok) return auth.response
  }
  const raw = await req.text()
  if (raw.length > MAX_BODY) return NextResponse.json({ error: 'corpo_grande_demais' }, { status: 413 })
  let body: unknown
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ error: 'json_invalido' }, { status: 400 }) }
  const v = validateBriefingInput(body)
  if (!v.ok) return NextResponse.json({ error: 'briefing_invalido', erros: v.erros }, { status: 422 })
  const b = v.value

  // Status e origem são definidos AQUI; nada disso vem do corpo da requisição.
  const { data, error } = await supabase
    .from('verve_briefings')
    .insert({
      titulo: b.titulo,
      objetivo: b.objetivo,
      publico_alvo: b.publico_alvo,
      pilar: b.pilar,
      gatilho_manychat: b.gatilho_manychat,
      semana: b.semana,
      posts: b.posts,
      status: 'proposta',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id, status: data.status, briefing: data, banner: 'Aguardando aprovação do CEO — nenhuma alteração aplicada' }, { status: 201 })
}

// PATCH /api/admin/verve/briefings — SÓ o administrador logado decide. Só decide uma proposta (nunca um briefing já decidido).
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => ({}))
  const { id, status } = body as { id?: string; status?: string }
  if (!id || !['aprovado', 'recusado'].includes(String(status))) {
    return NextResponse.json({ error: 'id e status (aprovado|recusado) são obrigatórios' }, { status: 400 })
  }

  const { data: atual } = await supabase.from('verve_briefings').select('*').eq('id', id).single()
  if (!atual || atual.status !== 'proposta') {
    return NextResponse.json({ error: 'briefing_inexistente_ou_ja_decidido' }, { status: 409 })
  }

  // Antes de aprovar, o plano guardado no banco passa de novo pelas mesmas regras (nada muda se for inválido).
  let plano = null as ReturnType<typeof validateBriefingInput> | null
  if (status === 'aprovado') {
    plano = validateBriefingInput({
      titulo: atual.titulo, objetivo: atual.objetivo, publico_alvo: atual.publico_alvo, pilar: atual.pilar,
      gatilho_manychat: atual.gatilho_manychat ?? '', semana: atual.semana, posts: atual.posts,
    })
    if (!plano.ok) return NextResponse.json({ error: 'plano_invalido_nada_foi_aprovado', erros: plano.erros }, { status: 422 })
  }

  const { data: briefing } = await supabase
    .from('verve_briefings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'proposta')
    .select()
    .single()
  if (!briefing) return NextResponse.json({ error: 'briefing_inexistente_ou_ja_decidido' }, { status: 409 })
  if (status !== 'aprovado' || !plano || !plano.ok) return NextResponse.json({ briefing, rascunhos_gerados: 0 })

  // Aprovado: os posts do plano viram rascunhos (legenda do Gustavo, se veio; senão a legenda é gerada abaixo).
  const linhas = plano.value.posts.map(p => ({
    tipo: p.tipo,
    titulo: p.tema,
    legenda: p.legenda ?? '',
    pilar: p.pilar,
    scheduled_at: p.scheduled_at,
    image_urls: [],
    slides: p.tipo === 'carrossel' ? 8 : null,
    status: 'rascunho',
    briefing_id: briefing.id,
  }))
  const { data: inserted, error: pErr } = await supabase.from('verve_posts').insert(linhas).select()
  if (pErr) return NextResponse.json({ briefing, error: 'rascunhos_nao_gerados: ' + pErr.message }, { status: 500 })

  // Renderiza slides automaticamente para posts do tipo carrossel
  // Cada post fica com image_urls preenchido — desbloqueio do fluxo de aprovação
  if (inserted?.length) {
    await Promise.allSettled(inserted.map(async (post: { id: string; titulo: string; pilar: string; tipo: string; slides: number | null }) => {
      if (post.tipo !== 'carrossel') return
      try {
        const urls = await renderCarrossel({
          titulo: post.titulo,
          pilar: post.pilar,
          slides: post.slides ?? 8,
          persona: briefing.publico_alvo?.includes('homem') ? 'homem_40_60' : 'mulher_35_50',
          postId: post.id,
        })
        if (urls.length) {
          await supabase.from('verve_posts').update({ image_urls: urls, status: 'aguardando' }).eq('id', post.id)
        }
      } catch { /* geração falhou; post fica como rascunho sem imagem */ }
    }))
  }

  // Legenda automática só para rascunho sem legenda, e só vale se passar pelo filtro de publicidade médica (a regra no prompt não basta).
  let geradas = 0
  let reprovadas = 0
  const semLegenda = (inserted ?? []).filter((p: { legenda?: string }) => !p.legenda)
  if (semLegenda.length && process.env.ANTHROPIC_API_KEY) {
    const client = new Anthropic()
    const pilarContext: Record<string, string> = {
      familia:    'paternidade, família, filhos, valores, legado, amor, pai presente',
      autoridade: 'medicina hormonal, implante de testosterona, longevidade, saúde masculina, Itajaí, mercado médico',
      lifestyle:  'rotina de alta performance, networking, eventos, vida equilibrada, prova social',
    }
    await Promise.allSettled(semLegenda.map(async (post: { id: string; titulo: string; pilar: string; tipo: string; slides: number | null }) => {
      const pilar = post.pilar ?? briefing.pilar
      const system = `Você é o VERVE, Diretor Autônomo de Mídia de Dr. Vinícius Cechella. Tom direto, científico, acessível. Pilar: ${pilar} — ${pilarContext[pilar] ?? pilar}. ${COMPLIANCE_RULES_PT} Termine com no máximo 5 hashtags de nicho.`
      try {
        const msg = await client.messages.create({
          model: process.env.VERVE_CAPTION_MODEL ?? 'claude-sonnet-5-5',
          max_tokens: 500,
          system,
          messages: [{ role: 'user', content: `Crie legenda para: "${post.titulo}" (${post.tipo}${post.slides ? `, ${post.slides} slides` : ''})` }],
        })
        const legenda = (msg.content[0] as { type: string; text: string }).text.trim()
        if (complianceViolations(legenda).length) { reprovadas++; return }
        await supabase.from('verve_posts').update({ legenda }).eq('id', post.id)
        geradas++
      } catch { /* legenda fica vazia, sem quebrar o fluxo */ }
    }))
  }

  return NextResponse.json({ briefing, rascunhos_gerados: linhas.length, legendas_geradas: geradas, legendas_reprovadas: reprovadas })
}
