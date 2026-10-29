// Núcleo PURO da venda do e-book (sem rede, sem banco): preço, assinatura do webhook, validação do pagamento e transições de estado.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export type Status = 'pendente' | 'pago' | 'recusado' | 'expirado' | 'reembolsado' | 'contestado'
export const PRECO_MINIMO_CENTAVOS = 1000   // abaixo disso é valor de teste esquecido (ex.: R$ 1,00): nunca vender

export interface Produto { slug: string; ativo?: boolean; valor_pix?: number | string | null; desconto_pix_pct?: number | string | null }

/** Preço em centavos lido do produto cadastrado. Valor de teste ou inválido = erro (fecha por padrão). */
export function precoCentavos(p: Produto | null | undefined, esperadoEnv?: string): { ok: true; centavos: number } | { ok: false; motivo: string } {
  if (!p) return { ok: false, motivo: 'produto_inexistente' }
  const base = Number(p.valor_pix)
  const desc = Number(p.desconto_pix_pct ?? 0)
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(desc) || desc < 0 || desc > 90) return { ok: false, motivo: 'preco_invalido' }
  const centavos = Math.round(base * 100 * (1 - desc / 100))
  if (centavos < PRECO_MINIMO_CENTAVOS) return { ok: false, motivo: 'preco_de_teste' }
  if (esperadoEnv && Number(esperadoEnv) !== centavos) return { ok: false, motivo: 'preco_diferente_do_aprovado' }
  return { ok: true, centavos }
}

export const novoSegredo = () => randomBytes(24).toString('base64url')
export const hashSegredo = (s: string) => createHash('sha256').update(s).digest('hex')
export function segredoConfere(segredo: string, hash: string): boolean {
  const a = Buffer.from(hashSegredo(segredo)), b = Buffer.from(hash || '')
  return a.length === b.length && timingSafeEqual(a, b)
}
export const novoCodigoIndicacao = () => randomBytes(5).toString('hex').toUpperCase()

/** Assinatura do webhook do Mercado Pago: HMAC-SHA256 de "id:<data.id>;request-id:<x-request-id>;ts:<ts>;". */
export function assinaturaValida(o: { segredo: string | undefined; xSignature: string | null; xRequestId: string | null; dataId: string }): boolean {
  if (!o.segredo || !o.xSignature) return false
  const partes = Object.fromEntries(o.xSignature.split(',').map(p => p.trim().split('=') as [string, string]))
  if (!partes.ts || !partes.v1) return false
  const manifesto = `id:${String(o.dataId).toLowerCase()};request-id:${o.xRequestId ?? ''};ts:${partes.ts};`
  const esperado = createHmac('sha256', o.segredo).update(manifesto).digest('hex')
  const a = Buffer.from(esperado), b = Buffer.from(partes.v1)
  return a.length === b.length && timingSafeEqual(a, b)
}

export interface PagamentoMP {
  id: number | string; status: string; status_detail?: string; transaction_amount: number; currency_id?: string
  external_reference?: string | null; payment_method_id?: string; collector_id?: number | string; date_last_updated?: string
  fee_details?: { amount: number }[]; date_of_expiration?: string
}
export interface PedidoMin { id: string; valor_centavos: number; moeda: string; status: Status; mp_payment_id?: string | null }

export function statusDoProvedor(mp: string): Status | null {
  switch (mp) {
    case 'approved': return 'pago'
    case 'pending': case 'in_process': case 'authorized': case 'in_mediation': return 'pendente'
    case 'rejected': case 'cancelled': return 'recusado'
    case 'refunded': return 'reembolsado'
    case 'charged_back': return 'contestado'
    case 'expired': return 'expirado'
    default: return null
  }
}

/** Antes de aprovar: o pagamento consultado NO PROVEDOR precisa bater com o pedido (valor, moeda, referência, recebedor, método). */
export function validarPagamento(pg: PagamentoMP, pedido: PedidoMin, opc: { collectorId?: string }): { ok: true } | { ok: false; motivo: string } {
  if (String(pg.external_reference ?? '') !== pedido.id) return { ok: false, motivo: 'referencia_divergente' }
  if ((pg.currency_id ?? 'BRL') !== pedido.moeda) return { ok: false, motivo: 'moeda_divergente' }
  if (Math.round(Number(pg.transaction_amount) * 100) !== pedido.valor_centavos) return { ok: false, motivo: 'valor_divergente' }
  if (pg.payment_method_id && pg.payment_method_id !== 'pix') return { ok: false, motivo: 'metodo_nao_habilitado' }
  if (opc.collectorId && String(pg.collector_id ?? '') !== String(opc.collectorId)) return { ok: false, motivo: 'recebedor_divergente' }
  if (pedido.mp_payment_id && String(pedido.mp_payment_id) !== String(pg.id)) return { ok: false, motivo: 'pagamento_duplo_para_o_pedido' }
  return { ok: true }
}

const PERMITIDAS: Record<Status, Status[]> = {
  pendente: ['pago', 'recusado', 'expirado'],
  recusado: ['pago'],          // pagamento tardio: o provedor pode aprovar depois
  expirado: ['pago'],
  pago: ['reembolsado', 'contestado'],
  contestado: ['reembolsado'],
  reembolsado: [],
}
export const transicaoPermitida = (de: Status, para: Status) => de === para || PERMITIDAS[de].includes(para)

export const taxaCentavos = (pg: PagamentoMP): number | null =>
  Array.isArray(pg.fee_details) && pg.fee_details.length ? Math.round(pg.fee_details.reduce((s, f) => s + Number(f.amount || 0), 0) * 100) : null

export const emailValido = (e: string) => /^[^\s@]{1,64}@[^\s@]{1,200}\.[^\s@]{2,}$/.test(e) && e.length <= 254
export const cpfValido = (c: string) => {
  const d = c.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  const dv = (n: number) => { let s = 0; for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r }
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10])
}
