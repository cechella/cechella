import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/verve/admin-auth'

export const dynamic = 'force-dynamic'

// Painel financeiro do e-book (admin). Valor desconhecido aparece como null, nunca como zero. Teste e venda real ficam separados.
export async function GET(req: NextRequest) {
  const adm = await requireAdmin(req)
  if (!adm.ok) return adm.response
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await s.from('ebook_pedidos').select('id,status,ambiente,valor_centavos,taxa_centavos,email,origem,indicacao_codigo,criado_em,pago_em')
  if (error) return NextResponse.json({ erro: 'indisponivel' }, { status: 503 })
  const { data: ent } = await s.from('ebook_entregas').select('pedido_id,downloads,status')
  const entregues = new Set((ent ?? []).filter(e => e.downloads > 0).map(e => e.pedido_id))
  const resumo = (amb: string) => {
    const ps = (data ?? []).filter(p => p.ambiente === amb)
    const pagos = ps.filter(p => p.status === 'pago')
    const soma = (l: typeof ps) => l.reduce((a, p) => a + p.valor_centavos, 0)
    const taxas = pagos.map(p => p.taxa_centavos)
    return {
      pedidos: ps.length, vendas_pagas: pagos.length, compradores_distintos: new Set(pagos.map(p => p.email)).size,
      bruto_centavos: soma(pagos), pendente_centavos: soma(ps.filter(p => p.status === 'pendente')),
      reembolsado_centavos: soma(ps.filter(p => p.status === 'reembolsado')), contestado_centavos: soma(ps.filter(p => p.status === 'contestado')),
      taxas_centavos: taxas.length && taxas.every(t => t != null) ? taxas.reduce((a, t) => a + (t as number), 0) : null,
      entregas_comprovadas: pagos.filter(p => entregues.has(p.id)).length, pagas_sem_entrega: pagos.filter(p => !entregues.has(p.id)).length,
      por_origem: Object.fromEntries(Array.from(new Set(pagos.map(p => p.origem ?? 'desconhecida'))).map(o => [o, pagos.filter(p => (p.origem ?? 'desconhecida') === o).length])),
      com_indicacao: pagos.filter(p => p.indicacao_codigo).length,
    }
  }
  return NextResponse.json({ real: resumo('real'), teste: resumo('teste'), observacao: 'bruto não é líquido: taxas, impostos, reembolsos e custos são separados; null = desconhecido' })
}
