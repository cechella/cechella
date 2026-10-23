// Gera as imagens de UM carrossel a partir do briefing guardado (slides do Gustavo + público). Usado pelo render automático (o agendador do ATLAS),
// pelo botão da aba Aprovação e pela CORREÇÃO DE FOTOS pedida pelo CEO ao Gustavo (refazer com outra faixa etária, pessoa ou direção de arte).
// Falha fechada: o post só vai para "aguardando" com TODAS as imagens; se a nova geração falhar, as imagens antigas continuam como estavam.
import type { SupabaseClient } from '@supabase/supabase-js'
import { renderCarrossel } from './render-slide'
import { detectPersona, detectFaixa, type Faixa } from './persona'

export type ResultadoRender =
  | { ok: true; imagens: number; persona: string; faixa: Faixa; slides_do_gustavo: boolean; image_urls: string[] }
  | { ok: false; erro: string; status: number; geradas?: number; esperadas?: number }

export interface OpcoesRender {
  statusPermitidos?: string[]                 // padrão: só rascunho
  persona?: 'mulher_35_50' | 'homem_40_60'    // sobrepõe a persona detectada
  faixa?: Faixa                               // sobrepõe a faixa do briefing
  instrucao?: string                          // direção de arte já validada
  nova_pasta?: boolean                        // refazer: caminhos novos no Blob (não sobrescreve nem quebra a URL antiga)
}

export async function renderPost(supabase: SupabaseClient, postId: string, opcoes: OpcoesRender = {}): Promise<ResultadoRender> {
  const permitidos = opcoes.statusPermitidos ?? ['rascunho']
  const { data: post } = await supabase.from('verve_posts').select('*').eq('id', postId).single()
  if (!post) return { ok: false, erro: 'post_nao_encontrado', status: 404 }
  if (!permitidos.includes(post.status)) return { ok: false, erro: permitidos.length === 1 && permitidos[0] === 'rascunho' ? 'so_refaz_rascunho' : 'status_nao_permite_refazer', status: 409 }
  if (post.tipo !== 'carrossel') return { ok: false, erro: 'so_carrossel', status: 422 }

  let publico: string | undefined, objetivo: string | undefined
  let slides: { titulo: string; texto: string }[] = []
  if (post.briefing_id) {
    const { data: b } = await supabase.from('verve_briefings').select('objetivo,publico_alvo,posts').eq('id', post.briefing_id).single()
    if (b) {
      publico = b.publico_alvo; objetivo = b.objetivo
      const plano = Array.isArray(b.posts) ? (b.posts as Array<{ tema?: string; slides?: { titulo: string; texto: string }[] }>) : []
      slides = plano.find(p => p.tema === post.titulo)?.slides ?? []
    }
  }
  const persona = opcoes.persona ?? detectPersona(publico, post.titulo, objetivo)
  const faixa = opcoes.faixa ?? detectFaixa(publico, objetivo)
  const total = slides.length || post.slides || 8
  const esperadas = Math.max(2, Math.min(total, 10))

  const urls = await renderCarrossel({
    titulo: String(post.titulo),
    temas: slides.map(s => s.titulo),
    descricoes: slides.map(s => s.texto),
    pilar: post.pilar,
    slides: total,
    persona,
    faixa,
    instrucao: opcoes.instrucao,
    postId: opcoes.nova_pasta ? `${post.id}/r${Date.now()}` : post.id,
  })
  if (urls.length !== esperadas) return { ok: false, erro: 'geracao_incompleta', status: 502, geradas: urls.length, esperadas }
  // Qualquer status permitido volta para "aguardando": trocar a imagem invalida uma autorização anterior, o CEO vê e autoriza de novo.
  const { error } = await supabase.from('verve_posts').update({ image_urls: urls, status: 'aguardando' }).eq('id', post.id).eq('status', post.status)
  if (error) return { ok: false, erro: error.message, status: 500 }
  return { ok: true, imagens: urls.length, persona, faixa, slides_do_gustavo: slides.length > 0, image_urls: urls }
}

export async function renderPostRascunho(supabase: SupabaseClient, postId: string): Promise<ResultadoRender> {
  return renderPost(supabase, postId)
}
