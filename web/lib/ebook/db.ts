// Adaptador Supabase (chave de serviço, só no servidor) das tabelas PRÓPRIAS do e-book. Não toca leads, pagamentos nem o produto fixo da Ana.
import { createClient } from '@supabase/supabase-js'
import type { Db, Pedido } from './service'

export function dbSupabase(): Db {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const ok = <T,>(r: { data: T | null; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data }
  return {
    async produto(slug) { return ok(await s.from('produtos').select('slug,ativo,valor_pix,desconto_pix_pct').eq('slug', slug).maybeSingle()) },   // só LÊ o cadastro do produto
    async versaoAtiva() { return ok(await s.from('ebook_versoes').select('versao,storage_key').eq('ativa', true).maybeSingle()) },
    async storagePorVersao(v) { return (ok(await s.from('ebook_versoes').select('storage_key').eq('versao', v).maybeSingle()) as { storage_key: string } | null)?.storage_key ?? null },
    async pedidoPorChave(chave) { return ok(await s.from('ebook_pedidos').select('*').eq('chave', chave).maybeSingle()) as Pedido | null },
    async pedido(id) { return ok(await s.from('ebook_pedidos').select('*').eq('id', id).maybeSingle()) as Pedido | null },
    async inserirPedido(p) {
      const r = await s.from('ebook_pedidos').insert(p).select('*').single()
      if (r.error) { if (r.error.code === '23505') return 'chave_repetida'; throw new Error(r.error.message) }
      return r.data as Pedido
    },
    async atualizarPedidoSe(id, de, campos) {
      const r = await s.from('ebook_pedidos').update({ ...campos, atualizado_em: new Date().toISOString() }).eq('id', id).in('status', de).select('id')
      if (r.error) throw new Error(r.error.message)
      return (r.data?.length ?? 0) > 0
    },
    async atualizarPedido(id, campos) { ok(await s.from('ebook_pedidos').update({ ...campos, atualizado_em: new Date().toISOString() }).eq('id', id).select('id').maybeSingle()) },
    async registrarEvento(chave, pedidoId, resumo) {
      const r = await s.from('ebook_eventos').insert({ chave, pedido_id: pedidoId, resumo })
      if (r.error) { if (r.error.code === '23505') return false; throw new Error(r.error.message) }
      return true
    },
    async garantirEntrega(pedidoId, versao) {
      const r = await s.from('ebook_entregas').insert({ pedido_id: pedidoId, versao })
      if (r.error) { if (r.error.code === '23505') return 'ja_existia'; throw new Error(r.error.message) }
      return 'criada'
    },
    async entrega(pedidoId) { return ok(await s.from('ebook_entregas').select('*').eq('pedido_id', pedidoId).maybeSingle()) as never },
    async atualizarEntrega(pedidoId, campos) { ok(await s.from('ebook_entregas').update(campos).eq('pedido_id', pedidoId).select('pedido_id').maybeSingle()) },
    async pedidosPendentes(desdeIso) { return (ok(await s.from('ebook_pedidos').select('*').eq('status', 'pendente').gte('criado_em', desdeIso).limit(200)) ?? []) as Pedido[] },
  }
}
