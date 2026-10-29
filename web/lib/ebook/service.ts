// Regras da venda do e-book sobre interfaces (banco e provedor injetados): testável sem rede.
import { precoCentavos, novoSegredo, hashSegredo, novoCodigoIndicacao, statusDoProvedor, validarPagamento, transicaoPermitida, taxaCentavos, emailValido, cpfValido,
  type PagamentoMP, type Produto, type Status } from './core'

export interface Pedido {
  id: string; chave: string; produto_slug: string; versao: string | null; valor_centavos: number; moeda: string; status: Status; ambiente: 'real' | 'teste'
  email: string; nome?: string | null; origem?: string | null; indicacao_codigo?: string | null; codigo_proprio?: string | null; acesso_hash: string
  mp_payment_id?: string | null; mp_status?: string | null; pix_copia_cola?: string | null; pix_expira_em?: string | null; taxa_centavos?: number | null
  pago_em?: string | null; tardio?: boolean
}
export interface Entrega { pedido_id: string; versao: string; status: 'liberada' | 'falhou'; downloads: number; tentativas: number; ultimo_erro?: string | null }
export interface Db {
  produto(slug: string): Promise<(Produto & { ativo?: boolean }) | null>
  versaoAtiva(): Promise<{ versao: string; storage_key: string } | null>
  storagePorVersao(versao: string): Promise<string | null>
  pedidoPorChave(chave: string): Promise<Pedido | null>
  pedido(id: string): Promise<Pedido | null>
  inserirPedido(p: Omit<Pedido, 'id'>): Promise<Pedido | 'chave_repetida'>
  /** Atualização CONDICIONAL: só aplica se o status atual estiver em `de`. Devolve se aplicou (base da idempotência). */
  atualizarPedidoSe(id: string, de: Status[], campos: Partial<Pedido>): Promise<boolean>
  atualizarPedido(id: string, campos: Partial<Pedido>): Promise<void>
  registrarEvento(chave: string, pedidoId: string | null, resumo: string): Promise<boolean>   // false = já existia
  garantirEntrega(pedidoId: string, versao: string): Promise<'criada' | 'ja_existia'>
  entrega(pedidoId: string): Promise<Entrega | null>
  atualizarEntrega(pedidoId: string, campos: Partial<Entrega> & { ultimo_download_em?: string }): Promise<void>
  pedidosPendentes(desdeIso: string): Promise<Pedido[]>
}
export interface Provedor {
  criarPix(o: { chave: string; centavos: number; descricao: string; pedidoId: string; email: string; cpf?: string; expiraEm: string; notificacaoUrl: string }): Promise<PagamentoMP & { pix_copia_cola?: string }>
  obterPagamento(id: string): Promise<PagamentoMP>
  buscarPorReferencia(pedidoId: string): Promise<PagamentoMP[]>
}
export interface Ctx { db: Db; mp: Provedor; agora: () => Date; opc: { precoEsperado?: string; collectorId?: string; siteUrl: string; ambiente: 'real' | 'teste' } }

export type Erro = { ok: false; status: number; erro: string }

export async function criarPedido(ctx: Ctx, e: { chave: string; email: string; nome?: string; cpf?: string; origem?: string; indicacao?: string; slug?: string }): Promise<{ ok: true; pedido: Pedido; segredo?: string; reutilizado: boolean } | Erro> {
  const { db, mp, agora, opc } = ctx
  if (!/^[0-9a-f-]{16,64}$/i.test(e.chave || '')) return { ok: false, status: 400, erro: 'chave_invalida' }
  if (!emailValido(e.email || '')) return { ok: false, status: 400, erro: 'email_invalido' }
  if (e.cpf && !cpfValido(e.cpf)) return { ok: false, status: 400, erro: 'cpf_invalido' }
  const existente = await db.pedidoPorChave(e.chave)
  if (existente) return { ok: true, pedido: existente, reutilizado: true }      // pedido repetido (clique duplo, áudio+texto): não cria outro nem outro Pix
  const slug = e.slug || 'ebook-ia-empresas'
  const produto = await db.produto(slug)
  if (!produto || produto.ativo !== true) return { ok: false, status: 403, erro: 'venda_nao_aberta' }   // enquanto o CEO não ativar o produto, ninguém compra
  const preco = precoCentavos(produto, opc.precoEsperado)
  if (!preco.ok) return { ok: false, status: 409, erro: preco.motivo }
  const versao = await db.versaoAtiva()
  if (!versao) return { ok: false, status: 409, erro: 'sem_arquivo_para_entregar' }          // nunca vender sem ter o que entregar
  const segredo = novoSegredo()
  const criado = await db.inserirPedido({
    chave: e.chave, produto_slug: slug, versao: versao.versao, valor_centavos: preco.centavos, moeda: 'BRL', status: 'pendente', ambiente: opc.ambiente, email: e.email.trim().toLowerCase(),
    nome: e.nome?.slice(0, 120) ?? null, origem: e.origem?.slice(0, 60) ?? null, indicacao_codigo: e.indicacao?.slice(0, 20).toUpperCase() ?? null, codigo_proprio: novoCodigoIndicacao(), acesso_hash: hashSegredo(segredo),
  })
  if (criado === 'chave_repetida') { const p = await db.pedidoPorChave(e.chave); return p ? { ok: true, pedido: p, reutilizado: true } : { ok: false, status: 409, erro: 'conflito' } }
  try {
    const expira = new Date(agora().getTime() + 30 * 60_000).toISOString()
    const pg = await mp.criarPix({ chave: e.chave, centavos: criado.valor_centavos, descricao: 'E-book IA para Pequenas e Médias Empresas', pedidoId: criado.id, email: criado.email, cpf: e.cpf, expiraEm: expira, notificacaoUrl: `${opc.siteUrl}/api/ebook/webhook` })
    await db.atualizarPedido(criado.id, { mp_payment_id: String(pg.id), mp_status: pg.status, pix_copia_cola: pg.pix_copia_cola ?? null, pix_expira_em: pg.date_of_expiration ?? expira })
    return { ok: true, pedido: { ...criado, mp_payment_id: String(pg.id), mp_status: pg.status, pix_copia_cola: pg.pix_copia_cola ?? null }, segredo, reutilizado: false }
  } catch {
    // timeout/erro ao criar o Pix: o pedido fica pendente SEM pagamento; a mesma chave reaproveita o Pix do provedor (idempotência) na próxima tentativa.
    return { ok: false, status: 502, erro: 'pix_indisponivel' }
  }
}

export type Resultado = { aplicado: boolean; motivo?: string; entrega?: 'criada' | 'ja_existia'; status?: Status }

/** Aplica o ESTADO ATUAL do pagamento (consultado no provedor). A ordem dos eventos não importa: sempre vale o que o provedor diz agora. */
export async function aplicarPagamento(ctx: Ctx, pg: PagamentoMP): Promise<Resultado> {
  const { db, opc, agora } = ctx
  const pedidoId = String(pg.external_reference ?? '')
  const pedido = pedidoId ? await db.pedido(pedidoId) : null
  if (!pedido) return { aplicado: false, motivo: 'pedido_desconhecido' }
  const novo = statusDoProvedor(pg.status)
  if (!novo) return { aplicado: false, motivo: 'status_desconhecido' }
  const chaveEvento = `${pg.id}:${pg.status}:${pg.date_last_updated ?? ''}`
  const v = validarPagamento(pg, pedido, { collectorId: opc.collectorId })
  if (!v.ok) { await db.registrarEvento(chaveEvento, pedido.id, 'bloqueado:' + v.motivo); return { aplicado: false, motivo: v.motivo } }   // divergência nunca libera acesso
  if (!(await db.registrarEvento(chaveEvento, pedido.id, `${pg.status}`))) return { aplicado: false, motivo: 'evento_repetido' }
  if (pedido.mp_payment_id == null) await db.atualizarPedido(pedido.id, { mp_payment_id: String(pg.id) })
  if (novo === 'pendente') { await db.atualizarPedido(pedido.id, { mp_status: pg.status }); return { aplicado: false, motivo: 'ainda_pendente', status: pedido.status } }
  const atual = (await db.pedido(pedido.id))!.status
  if (!transicaoPermitida(atual, novo)) return { aplicado: false, motivo: 'transicao_ignorada', status: atual }
  const campos: Partial<Pedido> = { status: novo, mp_status: pg.status }
  if (novo === 'pago') { campos.pago_em = agora().toISOString(); campos.taxa_centavos = taxaCentavos(pg); campos.tardio = atual === 'expirado' || atual === 'recusado' }
  const aplicou = await db.atualizarPedidoSe(pedido.id, [atual], campos)   // condicional: duas execuções simultâneas, só uma aplica
  if (!aplicou) return { aplicado: false, motivo: 'concorrencia', status: atual }
  if (novo === 'pago') {
    const fresco = (await db.pedido(pedido.id))!
    const entrega = await db.garantirEntrega(pedido.id, fresco.versao ?? '')   // uma entrega por pedido, mesmo se o webhook repetir
    return { aplicado: true, entrega, status: 'pago' }
  }
  return { aplicado: true, status: novo }
}

export async function processarWebhook(ctx: Ctx, dataId: string): Promise<Resultado> {
  const pg = await ctx.mp.obterPagamento(dataId)   // o webhook é só um aviso: a verdade é a consulta ao provedor
  return aplicarPagamento(ctx, pg)
}

/** Reconciliação: pedidos pendentes são consultados no provedor (webhook perdido ou fora de ordem). */
export async function reconciliar(ctx: Ctx, janelaHoras = 48): Promise<{ vistos: number; aplicados: number }> {
  const desde = new Date(ctx.agora().getTime() - janelaHoras * 3600_000).toISOString()
  let aplicados = 0
  const pendentes = await ctx.db.pedidosPendentes(desde)
  for (const p of pendentes) {
    const lista = await ctx.mp.buscarPorReferencia(p.id).catch(() => [] as PagamentoMP[])
    for (const pg of lista) { const r = await aplicarPagamento(ctx, pg); if (r.aplicado) aplicados++ }
    if (p.pix_expira_em && new Date(p.pix_expira_em) < ctx.agora()) await ctx.db.atualizarPedidoSe(p.id, ['pendente'], { status: 'expirado' })
  }
  return { vistos: pendentes.length, aplicados }
}

/** Libera o download do arquivo CORRETO ao dono do pedido pago. Repetir o pedido de acesso reenvia sem cobrar de novo. */
export async function liberarDownload(ctx: Ctx, id: string, segredo: string, assinar: (storageKey: string) => Promise<string>, confere: (s: string, h: string) => boolean): Promise<{ ok: true; url: string } | Erro> {
  const pedido = await ctx.db.pedido(id)
  if (!pedido || !confere(segredo, pedido.acesso_hash)) return { ok: false, status: 404, erro: 'nao_encontrado' }   // não revela se o pedido existe
  if (pedido.status !== 'pago') return { ok: false, status: 402, erro: 'pagamento_nao_confirmado' }
  const entrega = await ctx.db.entrega(id)
  if (!entrega) return { ok: false, status: 409, erro: 'entrega_em_preparo' }
  try {
    const key = await ctx.db.storagePorVersao(entrega.versao)
    if (!key) throw new Error('sem_arquivo')
    const url = await assinar(key)
    await ctx.db.atualizarEntrega(id, { status: 'liberada', downloads: entrega.downloads + 1, tentativas: entrega.tentativas + 1, ultimo_erro: null, ultimo_download_em: ctx.agora().toISOString() })
    return { ok: true, url }
  } catch (err) {
    await ctx.db.atualizarEntrega(id, { status: 'falhou', tentativas: entrega.tentativas + 1, ultimo_erro: String((err as Error).message).slice(0, 120) })
    return { ok: false, status: 503, erro: 'entrega_falhou_tente_novamente' }   // o pedido continua PAGO; nada é cobrado de novo
  }
}
