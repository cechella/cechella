// Correção de fotos pedida pelo CEO (via Gustavo): valida o pedido e escolhe o post. Regras puras, testadas isoladas.
import type { OpcoesRender } from './render-post'

export const STATUS_REFAZ = ['rascunho', 'aguardando', 'aprovado']   // nunca "publicando" nem "publicado": o que já foi ao ar não se troca aqui
const PROIBIDO = /\b(nu|nua|nude|naked|nudez|sexy|sensual|lingerie|seios?|biqu[ií]ni|bikini|antes e depois|before and after|topless)\b/i

export type Pedido = { ok: true; id?: string; opcoes: OpcoesRender } | { ok: false; erro: string }

export function validarPedido(body: unknown): Pedido {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const opcoes: OpcoesRender = { statusPermitidos: STATUS_REFAZ, nova_pasta: true }
  if (b.id !== undefined && (typeof b.id !== 'string' || !b.id.trim())) return { ok: false, erro: 'id_invalido' }
  if (b.faixa !== undefined) {
    const f = b.faixa as { min?: unknown; max?: unknown }
    if (!f || !Number.isInteger(f.min) || !Number.isInteger(f.max) || (f.min as number) < 30 || (f.max as number) > 80 || (f.min as number) >= (f.max as number)) return { ok: false, erro: 'faixa_invalida' }
    opcoes.faixa = { min: f.min as number, max: f.max as number }
  }
  if (b.persona !== undefined) {
    if (b.persona !== 'mulher_35_50' && b.persona !== 'homem_40_60') return { ok: false, erro: 'persona_invalida' }
    opcoes.persona = b.persona
  }
  if (b.instrucao !== undefined && b.instrucao !== null && b.instrucao !== '') {
    if (typeof b.instrucao !== 'string') return { ok: false, erro: 'instrucao_invalida' }
    const t = b.instrucao.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim()
    if (t.length > 160) return { ok: false, erro: 'instrucao_longa_demais' }
    if (PROIBIDO.test(t)) return { ok: false, erro: 'instrucao_recusada' }
    if (t) opcoes.instrucao = t
  }
  // "refazer": o CEO só disse que as fotos não ficaram boas; vale o padrão visual do VERVE (personagem bonita e consistente), sem parâmetro novo.
  if (!opcoes.faixa && !opcoes.persona && !opcoes.instrucao && b.refazer !== true) return { ok: false, erro: 'nada_a_mudar' }
  return { ok: true, id: typeof b.id === 'string' ? b.id.trim() : undefined, opcoes }
}

// Sem id: o carrossel mais recente que ainda não foi ao ar (o que o CEO está vendo na aba Aprovação).
export function escolherAlvo(posts: Array<{ id: string; status: string; tipo?: string; created_at?: string }>): string | null {
  const c = posts.filter(p => p.tipo === 'carrossel' && STATUS_REFAZ.includes(p.status))
  c.sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
  return c[0]?.id ?? null
}
