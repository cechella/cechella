import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { precoCentavos, assinaturaValida, validarPagamento, transicaoPermitida, segredoConfere, statusDoProvedor, cpfValido, type PagamentoMP } from './core.ts'
import { criarPedido, aplicarPagamento, processarWebhook, reconciliar, liberarDownload, type Db, type Pedido, type Entrega, type Provedor, type Ctx } from './service.ts'

function fakeDb(over: { ativo?: boolean; valor_pix?: number; semVersao?: boolean } = {}) {
  const pedidos = new Map<string, Pedido>(); const eventos = new Set<string>(); const entregas = new Map<string, Entrega>(); let n = 0
  const db: Db = {
    async produto() { return { slug: 'ebook-ia-empresas', ativo: over.ativo ?? true, valor_pix: over.valor_pix ?? 197, desconto_pix_pct: 0 } },
    async versaoAtiva() { return over.semVersao ? null : { versao: 'v2', storage_key: 'ebook/v2.pdf' } },
    async storagePorVersao(v) { return v === 'v2' ? 'ebook/v2.pdf' : null },
    async pedidoPorChave(c) { return [...pedidos.values()].find(p => p.chave === c) ?? null },
    async pedido(id) { const p = pedidos.get(id); return p ? { ...p } : null },
    async inserirPedido(p) { if ([...pedidos.values()].some(x => x.chave === p.chave)) return 'chave_repetida'; const id = 'ped-' + (++n); const row = { ...p, id } as Pedido; pedidos.set(id, row); return { ...row } },
    async atualizarPedidoSe(id, de, c) { const p = pedidos.get(id)!; if (!de.includes(p.status)) return false; Object.assign(p, c); return true },
    async atualizarPedido(id, c) { Object.assign(pedidos.get(id)!, c) },
    async registrarEvento(k) { if (eventos.has(k)) return false; eventos.add(k); return true },
    async garantirEntrega(id, versao) { if (entregas.has(id)) return 'ja_existia'; entregas.set(id, { pedido_id: id, versao, status: 'liberada', downloads: 0, tentativas: 0 }); return 'criada' },
    async entrega(id) { return entregas.get(id) ?? null },
    async atualizarEntrega(id, c) { Object.assign(entregas.get(id)!, c) },
    async pedidosPendentes() { return [...pedidos.values()].filter(p => p.status === 'pendente') },
  }
  return { db, pedidos, entregas }
}
function fakeMp() {
  const chamadasPix: string[] = []; const pagamentos = new Map<string, PagamentoMP>()
  const mp: Provedor = {
    async criarPix(o) { chamadasPix.push(o.chave); const pg = { id: 'mp-' + o.pedidoId, status: 'pending', transaction_amount: o.centavos / 100, currency_id: 'BRL', external_reference: o.pedidoId, payment_method_id: 'pix', pix_copia_cola: '000201...' }; pagamentos.set(String(pg.id), pg); return pg },
    async obterPagamento(id) { return { ...pagamentos.get(id)! } },
    async buscarPorReferencia(pid) { return [...pagamentos.values()].filter(p => p.external_reference === pid) },
  }
  return { mp, chamadasPix, pagamentos }
}
const agoraFixo = new Date('2026-11-01T12:00:00Z')
function ctx(over = {}, opc: Partial<Ctx['opc']> = {}) {
  const d = fakeDb(over); const m = fakeMp()
  const c: Ctx = { db: d.db, mp: m.mp, agora: () => agoraFixo, opc: { siteUrl: 'https://x.test', ambiente: 'teste', ...opc } }
  return { c, ...d, ...m }
}
const E = { chave: '11111111-2222-3333-4444-555555555555', email: 'Comprador@Teste.com', nome: 'Ana' }
const aprovar = (t: ReturnType<typeof ctx>, id: string, extra: Partial<PagamentoMP> = {}) => { const pg = t.pagamentos.get('mp-' + id)!; Object.assign(pg, { status: 'approved', date_last_updated: '2026-11-01T12:01:00Z', fee_details: [{ amount: 9.35 }], ...extra }); return pg }

test('preço: lê do produto; R$ 1 de teste e valores inválidos nunca vendem', () => {
  assert.deepEqual(precoCentavos({ slug: 'x', valor_pix: 197, desconto_pix_pct: 0 }), { ok: true, centavos: 19700 })
  assert.deepEqual(precoCentavos({ slug: 'x', valor_pix: 1 }), { ok: false, motivo: 'preco_de_teste' })
  assert.equal(precoCentavos({ slug: 'x', valor_pix: 'abc' }).ok, false)
  assert.equal(precoCentavos(null).ok, false)
  assert.deepEqual(precoCentavos({ slug: 'x', valor_pix: 197 }, '29700'), { ok: false, motivo: 'preco_diferente_do_aprovado' })
  assert.equal(precoCentavos({ slug: 'x', valor_pix: 197, desconto_pix_pct: 10 }).ok && (precoCentavos({ slug: 'x', valor_pix: 197, desconto_pix_pct: 10 }) as { centavos: number }).centavos, 17730)
})

test('assinatura do webhook: válida, adulterada e sem segredo', () => {
  const segredo = 's3'; const ts = '1730000000'; const m = `id:abc;request-id:r1;ts:${ts};`
  const v1 = createHmac('sha256', segredo).update(m).digest('hex')
  assert.equal(assinaturaValida({ segredo, xSignature: `ts=${ts},v1=${v1}`, xRequestId: 'r1', dataId: 'ABC' }), true)
  assert.equal(assinaturaValida({ segredo, xSignature: `ts=${ts},v1=${v1}`, xRequestId: 'r2', dataId: 'abc' }), false)
  assert.equal(assinaturaValida({ segredo: undefined, xSignature: `ts=${ts},v1=${v1}`, xRequestId: 'r1', dataId: 'abc' }), false)
  assert.equal(assinaturaValida({ segredo, xSignature: null, xRequestId: 'r1', dataId: 'abc' }), false)
})

test('venda fechada enquanto o produto estiver inativo, sem versão para entregar ou com preço de teste', async () => {
  assert.deepEqual(await criarPedido(ctx({ ativo: false }).c, E), { ok: false, status: 403, erro: 'venda_nao_aberta' })
  assert.deepEqual(await criarPedido(ctx({ semVersao: true }).c, E), { ok: false, status: 409, erro: 'sem_arquivo_para_entregar' })
  assert.deepEqual(await criarPedido(ctx({ valor_pix: 1 }).c, E), { ok: false, status: 409, erro: 'preco_de_teste' })
  assert.equal((await criarPedido(ctx().c, { ...E, email: 'invalido' }) as { erro: string }).erro, 'email_invalido')
})

test('pedido repetido (mesma chave) não cria segundo pedido nem segundo Pix', async () => {
  const t = ctx()
  const a = await criarPedido(t.c, E); const b = await criarPedido(t.c, E)
  assert.ok(a.ok && b.ok)
  assert.equal((a as { pedido: Pedido }).pedido.id, (b as { pedido: Pedido }).pedido.id)
  assert.equal((b as { reutilizado: boolean }).reutilizado, true)
  assert.equal(t.chamadasPix.length, 1); assert.equal(t.pedidos.size, 1)
  const p = (a as { pedido: Pedido }).pedido
  assert.equal(p.valor_centavos, 19700); assert.equal(p.email, 'comprador@teste.com')
  assert.notEqual((a as { segredo?: string }).segredo, p.acesso_hash)   // o hash é guardado, o segredo bruto só vai ao comprador
})

test('Pix não conta como venda; aprovado no provedor conta uma vez e cria uma entrega', async () => {
  const t = ctx(); const r = await criarPedido(t.c, E) as { pedido: Pedido }
  const id = r.pedido.id
  assert.equal(t.pedidos.get(id)!.status, 'pendente')
  aprovar(t, id)
  const w = await processarWebhook(t.c, 'mp-' + id)
  assert.equal(w.aplicado, true); assert.equal(w.entrega, 'criada')
  const p = t.pedidos.get(id)!; assert.equal(p.status, 'pago'); assert.equal(p.taxa_centavos, 935)
  assert.equal(t.entregas.size, 1)
})

test('webhook repetido não duplica baixa nem entrega', async () => {
  const t = ctx(); const id = ((await criarPedido(t.c, E)) as { pedido: Pedido }).pedido.id; aprovar(t, id)
  const r1 = await processarWebhook(t.c, 'mp-' + id); const r2 = await processarWebhook(t.c, 'mp-' + id)
  assert.equal(r1.aplicado, true); assert.equal(r2.aplicado, false); assert.equal(r2.motivo, 'evento_repetido'); assert.equal(t.entregas.size, 1)
})

test('duas execuções simultâneas: só uma aplica', async () => {
  const t = ctx(); const id = ((await criarPedido(t.c, E)) as { pedido: Pedido }).pedido.id; const pg = aprovar(t, id)
  const rs = await Promise.all([aplicarPagamento(t.c, { ...pg, date_last_updated: 'a' }), aplicarPagamento(t.c, { ...pg, date_last_updated: 'b' })])
  assert.equal(rs.filter(r => r.aplicado).length, 1); assert.equal(t.entregas.size, 1)
})

test('fora de ordem: aviso de reembolso antes do aprovado não regride nem libera; vale o estado atual do provedor', async () => {
  const t = ctx(); const id = ((await criarPedido(t.c, E)) as { pedido: Pedido }).pedido.id
  const pg = t.pagamentos.get('mp-' + id)!; pg.status = 'refunded'; pg.date_last_updated = 'x'
  const r = await processarWebhook(t.c, 'mp-' + id)
  assert.equal(r.aplicado, false); assert.equal(t.pedidos.get(id)!.status, 'pendente'); assert.equal(t.entregas.size, 0)
  aprovar(t, id); assert.equal((await processarWebhook(t.c, 'mp-' + id)).aplicado, true)
  const pg2 = t.pagamentos.get('mp-' + id)!; pg2.status = 'refunded'; pg2.date_last_updated = 'z'
  assert.equal((await processarWebhook(t.c, 'mp-' + id)).status, 'reembolsado')
})

test('divergência de valor, moeda, referência, recebedor ou pagamento duplo nunca libera', async () => {
  for (const [extra, motivo, opc] of [[{ transaction_amount: 1 }, 'valor_divergente', {}], [{ currency_id: 'USD' }, 'moeda_divergente', {}], [{ collector_id: 9 }, 'recebedor_divergente', { collectorId: '123' }], [{ payment_method_id: 'visa' }, 'metodo_nao_habilitado', {}]] as [Partial<PagamentoMP>, string, Partial<Ctx['opc']>][]) {
    const t = ctx({}, opc); const id = ((await criarPedido(t.c, E)) as { pedido: Pedido }).pedido.id; aprovar(t, id, extra)
    const r = await processarWebhook(t.c, 'mp-' + id); assert.equal(r.aplicado, false); assert.equal(r.motivo, motivo); assert.equal(t.pedidos.get(id)!.status, 'pendente'); assert.equal(t.entregas.size, 0)
  }
  const t = ctx(); const id = ((await criarPedido(t.c, E)) as { pedido: Pedido }).pedido.id
  const outro = { id: 'mp-outro', status: 'approved', transaction_amount: 197, currency_id: 'BRL', external_reference: id, payment_method_id: 'pix' }
  assert.equal((await aplicarPagamento(t.c, outro)).motivo, 'pagamento_duplo_para_o_pedido')
  assert.equal((await aplicarPagamento(t.c, { ...outro, external_reference: 'nao-existe' })).motivo, 'pedido_desconhecido')
})

test('pagamento tardio após expirar é aceito e marcado; recusado depois de pago não regride', async () => {
  const t = ctx(); const id = ((await criarPedido(t.c, E)) as { pedido: Pedido }).pedido.id
  t.pedidos.get(id)!.status = 'expirado'; aprovar(t, id)
  assert.equal((await processarWebhook(t.c, 'mp-' + id)).aplicado, true); assert.equal(t.pedidos.get(id)!.tardio, true)
  assert.equal(transicaoPermitida('pago', 'recusado'), false); assert.equal(statusDoProvedor('charged_back'), 'contestado')
})

test('pago com falha na entrega continua pago; nova tentativa entrega sem cobrar de novo', async () => {
  const t = ctx(); const r = await criarPedido(t.c, E) as { pedido: Pedido; segredo: string }; aprovar(t, r.pedido.id); await processarWebhook(t.c, 'mp-' + r.pedido.id)
  const falha = await liberarDownload(t.c, r.pedido.id, r.segredo, async () => { throw new Error('r2 fora do ar') }, segredoConfere)
  assert.deepEqual(falha, { ok: false, status: 503, erro: 'entrega_falhou_tente_novamente' })
  assert.equal(t.pedidos.get(r.pedido.id)!.status, 'pago'); assert.equal(t.entregas.get(r.pedido.id)!.status, 'falhou')
  const ok = await liberarDownload(t.c, r.pedido.id, r.segredo, async k => 'https://r2/' + k, segredoConfere)
  assert.deepEqual(ok, { ok: true, url: 'https://r2/ebook/v2.pdf' }); assert.equal(t.entregas.get(r.pedido.id)!.status, 'liberada'); assert.equal(t.chamadasPix.length, 1)
})

test('download: segredo errado, pedido pendente ou inexistente não entregam', async () => {
  const t = ctx(); const r = await criarPedido(t.c, E) as { pedido: Pedido; segredo: string }
  assert.equal((await liberarDownload(t.c, r.pedido.id, r.segredo, async k => k, segredoConfere) as { status: number }).status, 402)
  aprovar(t, r.pedido.id); await processarWebhook(t.c, 'mp-' + r.pedido.id)
  assert.equal((await liberarDownload(t.c, r.pedido.id, 'errado', async k => k, segredoConfere) as { status: number }).status, 404)
  assert.equal((await liberarDownload(t.c, 'ped-999', r.segredo, async k => k, segredoConfere) as { status: number }).status, 404)
})

test('reconciliação cobre webhook perdido e expira o que venceu', async () => {
  const t = ctx(); const id = ((await criarPedido(t.c, E)) as { pedido: Pedido }).pedido.id; aprovar(t, id)
  assert.deepEqual(await reconciliar(t.c), { vistos: 1, aplicados: 1 }); assert.equal(t.pedidos.get(id)!.status, 'pago')
  const t2 = ctx(); const id2 = ((await criarPedido(t2.c, { ...E, chave: 'aaaaaaaa-2222-3333-4444-555555555555' })) as { pedido: Pedido }).pedido.id
  t2.pedidos.get(id2)!.pix_expira_em = '2026-11-01T11:00:00Z'; await reconciliar(t2.c); assert.equal(t2.pedidos.get(id2)!.status, 'expirado')
})

test('cpf e segredo', () => { assert.equal(cpfValido('529.982.247-25'), true); assert.equal(cpfValido('111.111.111-11'), false); assert.equal(segredoConfere('a', 'x'), false) })
