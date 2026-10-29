import { NextRequest, NextResponse } from 'next/server'
import { contexto } from '../_ctx'
import { criarPedido } from '@/lib/ebook/service'
import { segredoConfere } from '@/lib/ebook/core'

export const dynamic = 'force-dynamic'

const publico = (p: { id: string; status: string; valor_centavos: number; pix_copia_cola?: string | null; pix_expira_em?: string | null; codigo_proprio?: string | null }) =>
  ({ pedido_id: p.id, status: p.status, valor_centavos: p.valor_centavos, pix_copia_cola: p.pix_copia_cola ?? null, pix_expira_em: p.pix_expira_em ?? null, codigo_indicacao: p.codigo_proprio ?? null })

// Cria o pedido (idempotente pela chave enviada) e o Pix. Só funciona com o produto ATIVO; o preço vem do cadastro, nunca do navegador.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  try {
    const r = await criarPedido(contexto(), { chave: String(b.chave || ''), email: String(b.email || ''), nome: b.nome, cpf: b.cpf, origem: b.origem, indicacao: b.indicacao })
    if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: r.status })
    return NextResponse.json({ ...publico(r.pedido), segredo: r.segredo ?? null, reutilizado: r.reutilizado })
  } catch { return NextResponse.json({ erro: 'indisponivel' }, { status: 503 }) }
}

// Acompanhar o pedido: precisa do segredo do comprador. Não revela se o pedido existe a quem não tem o segredo.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || '', t = req.nextUrl.searchParams.get('t') || ''
  try {
    const p = await contexto().db.pedido(id)
    if (!p || !segredoConfere(t, p.acesso_hash)) return NextResponse.json({ erro: 'nao_encontrado' }, { status: 404 })
    return NextResponse.json(publico(p))
  } catch { return NextResponse.json({ erro: 'indisponivel' }, { status: 503 }) }
}
