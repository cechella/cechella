import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const DEFAULTS = {
  pagamento: {
    valor_pix: 5000,
    valor_cartao: 5000,
    desconto_pix_pct: 0,
    parcelas_max: 6,
    juros_cartao_pct: 0,
    parcelamento_texto: 'até 6x sem juros',
  },
  campanha: {
    ativa: false,
    nome: '',
    desconto_pct: 0,
    inicio: '',
    fim: '',
    mensagem_whatsapp: '',
  },
  renovacao: {
    alertas_ativos: true,
    dias_antes: 30,
    mensagem: 'Olá! 💜 Seu implante hormonal está próximo do vencimento. Vamos agendar sua renovação?',
  },
}

export async function GET() {
  const supabase = makeClient()
  const { data } = await supabase
    .from('configuracoes')
    .select('chave, valor')

  const config: Record<string, unknown> = { ...DEFAULTS }
  if (data) {
    for (const row of data) {
      config[row.chave] = row.valor
    }
  }
  return NextResponse.json({ ok: true, config })
}

export async function POST(req: NextRequest) {
  const { chave, valor } = await req.json()
  if (!chave || valor === undefined) {
    return NextResponse.json({ error: 'chave e valor obrigatórios' }, { status: 400 })
  }

  const supabase = makeClient()
  const { error } = await supabase
    .from('configuracoes')
    .upsert({ chave, valor, updated_at: new Date().toISOString() }, { onConflict: 'chave' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Quando preços são salvos, sincroniza com o produto fixo ativo
  if (chave === 'pagamento') {
    const pag = valor as Record<string, unknown>

    // Descobre qual produto está como fixo (ou usa 'implante' como padrão)
    const { data: cfgAna } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', 'atendimento_ana')
      .maybeSingle()

    const slugAlvo: string = (cfgAna?.valor as any)?.produto_fixo ?? 'implante'

    await supabase
      .from('produtos')
      .update({
        valor_pix:          pag.valor_pix,
        valor_cartao:       pag.valor_cartao,
        desconto_pix_pct:   pag.desconto_pix_pct,
        parcelas_max:       pag.parcelas_max,
        parcelamento_texto: pag.parcelamento_texto,
      })
      .eq('slug', slugAlvo)
  }

  return NextResponse.json({ ok: true })
}
