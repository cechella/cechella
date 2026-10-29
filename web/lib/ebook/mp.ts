// Cliente do Mercado Pago para o e-book. A credencial vem SEMPRE do ambiente (MP_ACCESS_TOKEN); nunca de um valor escrito no código.
import type { Provedor } from './service'
import type { PagamentoMP } from './core'

export function clienteMP(token: string | undefined, f: typeof fetch = fetch): Provedor {
  if (!token) throw new Error('MP_ACCESS_TOKEN ausente')
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  return {
    async criarPix(o) {
      const r = await f('https://api.mercadopago.com/v1/payments', {
        method: 'POST', headers: { ...h, 'X-Idempotency-Key': o.chave },
        body: JSON.stringify({
          transaction_amount: o.centavos / 100, description: o.descricao, payment_method_id: 'pix', external_reference: o.pedidoId, date_of_expiration: o.expiraEm, notification_url: o.notificacaoUrl,
          payer: { email: o.email, ...(o.cpf ? { identification: { type: 'CPF', number: o.cpf.replace(/\D/g, '') } } : {}) }, metadata: { produto: 'ebook-ia-empresas', pedido: o.pedidoId },
        }),
      })
      const d = await r.json() as PagamentoMP & { point_of_interaction?: { transaction_data?: { qr_code?: string } } }
      if (!r.ok) throw new Error('mp_http_' + r.status)
      return { ...d, pix_copia_cola: d.point_of_interaction?.transaction_data?.qr_code }
    },
    async obterPagamento(id) {
      const r = await f(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(id)}`, { headers: h })
      if (!r.ok) throw new Error('mp_http_' + r.status)
      return await r.json() as PagamentoMP
    },
    async buscarPorReferencia(pedidoId) {
      const r = await f(`https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(pedidoId)}&sort=date_created&criteria=desc`, { headers: h })
      if (!r.ok) throw new Error('mp_http_' + r.status)
      return ((await r.json()) as { results?: PagamentoMP[] }).results ?? []
    },
  }
}
