import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MP_TOKEN = process.env.MP_ACCESS_TOKEN || 'APP_USR-1603783113978504-062408-d67a1021538897e0341f70bb7645fdcf-2669863266'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { type, data } = body

  console.log('[webhook/mp] Evento recebido:', type, data?.id)

  // Notificação de cobrança de assinatura (preapproval_payment)
  if (type === 'subscription_authorized_payment' || type === 'preapproval') {
    const eventId = data?.id
    if (!eventId) return NextResponse.json({ ok: true })

    // Buscar detalhes do pagamento no MP
    const resp = await fetch(`https://api.mercadopago.com/authorized_payments/${eventId}`, {
      headers: { 'Authorization': `Bearer ${MP_TOKEN}` },
    })
    const payment = await resp.json()
    console.log('[webhook/mp] Pagamento:', { status: payment.status, preapproval_id: payment.preapproval_id, amount: payment.transaction_amount })

    if (payment.status === 'approved' && payment.preapproval_id) {
      // Incrementar parcelas_pagas na tabela pagamentos_recorrentes
      const { data: recorrente } = await supabase
        .from('pagamentos_recorrentes')
        .select('id, parcelas_pagas, parcelas_total, lead_telefone')
        .eq('preapproval_id', String(payment.preapproval_id))
        .single()

      if (recorrente) {
        const novasParcelas = (recorrente.parcelas_pagas || 0) + 1
        const novoStatus = novasParcelas >= recorrente.parcelas_total ? 'concluido' : 'ativo'

        await supabase.from('pagamentos_recorrentes').update({
          parcelas_pagas: novasParcelas,
          proxima_cobranca: proximaData(),
          status: novoStatus,
        }).eq('id', recorrente.id)

        await supabase.from('pagamentos').insert({
          lead_telefone: recorrente.lead_telefone,
          payment_id: String(eventId),
          metodo: 'cartao_recorrente',
          valor: payment.transaction_amount,
          status: 'approved',
          parcelas: recorrente.parcelas_total,
          recorrente: true,
        })

        await supabase.from('leads')
          .update({ status_pagamento: 'pago' })
          .eq('telefone', recorrente.lead_telefone)

        console.log('[webhook/mp] Parcela', novasParcelas, '/', recorrente.parcelas_total, 'registrada')
      }
    }
  }

  return NextResponse.json({ ok: true })
}

function proximaData(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}
