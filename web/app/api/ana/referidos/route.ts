import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET — verificar_referidos(token)
// Retorna: total importados, confirmados, mensagens enviadas, faltam, completo
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token obrigatório' }, { status: 400 })

  // Busca lead pelo token
  const { data: lead } = await supabase
    .from('leads')
    .select('telefone, nome')
    .eq('token_indicacao', token)
    .maybeSingle()

  if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  // Contatos na sessao_wpp (importados pelo WhatsApp mas ainda não confirmados)
  const { data: sessao } = await supabase
    .from('sessao_wpp')
    .select('contatos')
    .eq('token', token)
    .maybeSingle()

  const contatosSessao: any[] = sessao?.contatos || []
  const totalImportados = contatosSessao.length

  // Contatos confirmados no banco (enviados via formulário)
  const { data: confirmados } = await supabase
    .from('contatos_referidos')
    .select('nome, telefone, profissao, hobby, status')
    .eq('indicado_por_telefone', lead.telefone)

  const totalConfirmados = confirmados?.length || 0
  const semDados = confirmados?.filter(c => !c.profissao || !c.hobby).length || 0
  const mensagensEnviadas = confirmados?.filter(c => c.status === 'mensagem_enviada').length || 0
  const faltamConfirmar = Math.max(0, 20 - totalConfirmados)
  const faltamMensagens = Math.max(0, totalConfirmados - mensagensEnviadas)

  // completo = 20 contatos confirmados com todos os dados preenchidos
  const completo = totalConfirmados >= 20 && semDados === 0

  // missao_completa = 20 contatos e todas as mensagens enviadas
  const missaoCompleta = totalConfirmados >= 20 && mensagensEnviadas >= 20

  return NextResponse.json({
    total: totalConfirmados,
    totalImportados,
    semDados,
    mensagensEnviadas,
    faltam: faltamConfirmar,
    faltamMensagens,
    completo,
    missaoCompleta,
  }, { headers: { 'Cache-Control': 'no-store' } })
}

// POST — finalizar_indicacoes(token)
// Marca o lead como missão completa
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'token obrigatório' }, { status: 400 })

    const { data: lead } = await supabase
      .from('leads')
      .select('telefone, nome')
      .eq('token_indicacao', token)
      .maybeSingle()

    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

    // Verifica se realmente completou
    const { data: confirmados } = await supabase
      .from('contatos_referidos')
      .select('status')
      .eq('indicado_por_telefone', lead.telefone)

    const total = confirmados?.length || 0
    const enviadas = confirmados?.filter(c => c.status === 'mensagem_enviada').length || 0

    // Atualiza etapa do lead para 8 (encerramento)
    await supabase
      .from('leads')
      .update({ etapa: 8 })
      .eq('token_indicacao', token)

    return NextResponse.json({
      ok: true,
      total,
      mensagensEnviadas: enviadas,
      missaoCompleta: total >= 20 && enviadas >= 20,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
