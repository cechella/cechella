import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MP_TOKEN = process.env.MP_ACCESS_TOKEN || 'APP_USR-1603783113978504-062408-d67a1021538897e0341f70bb7645fdcf-2669863266'
const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text'
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'
const CRON_SECRET = process.env.CRON_SECRET || ''

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Executa diariamente via Vercel Cron (configurar em vercel.json)
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 })
  }

  const hoje = new Date().toISOString().split('T')[0]

  // Buscar cobranças vencidas hoje ou anteriores
  const { data: cobrancas } = await supabase
    .from('pagamentos_recorrentes')
    .select('*')
    .eq('status', 'ativo')
    .lte('proxima_cobranca', hoje)
    .lt('parcelas_pagas', 6)

  if (!cobrancas || cobrancas.length === 0) {
    return NextResponse.json({ processadas: 0 })
  }

  let processadas = 0
  let falhas = 0

  for (const cobranca of cobrancas) {
    const parcela = cobranca.parcelas_pagas + 1

    try {
      const resp = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MP_TOKEN}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `recorrente-${cobranca.id}-parcela-${parcela}`,
        },
        body: JSON.stringify({
          transaction_amount: cobranca.valor,
          token: cobranca.card_token,
          description: `Programa Hormonal — Parcela ${parcela}/6`,
          installments: 1,
          payment_method_id: cobranca.payment_method_id,
          issuer_id: cobranca.issuer_id,
          payer: { email: 'pagador@hormoneecosystem.com' },
          metadata: { telefone: cobranca.lead_telefone, metodo: 'cartao_recorrente', parcela },
        }),
      })

      const pagamento = await resp.json()

      if (pagamento.status === 'approved') {
        const novasParcelas = parcela
        const finalizado = novasParcelas >= cobranca.parcelas_total

        await supabase
          .from('pagamentos_recorrentes')
          .update({
            parcelas_pagas: novasParcelas,
            proxima_cobranca: finalizado ? null : proximaData(),
            status: finalizado ? 'concluido' : 'ativo',
          })
          .eq('id', cobranca.id)

        await supabase.from('pagamentos').insert({
          lead_telefone: cobranca.lead_telefone,
          payment_id: String(pagamento.id),
          metodo: 'cartao_recorrente',
          valor: cobranca.valor,
          status: 'approved',
          parcelas: 1,
          recorrente: true,
        })

        processadas++
      } else {
        // Falha na cobrança — registrar e notificar admin
        await supabase
          .from('pagamentos_recorrentes')
          .update({ status: 'falha_cobranca' })
          .eq('id', cobranca.id)

        await supabase.from('leads').update({ status_pagamento: 'cobranca_recorrente_falhou' })
          .eq('telefone', cobranca.lead_telefone)

        falhas++
      }
    } catch {
      falhas++
    }
  }

  return NextResponse.json({ processadas, falhas, total: cobrancas.length })
}

function proximaData(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}
