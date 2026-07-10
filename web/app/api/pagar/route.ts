import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 10

const MP_TOKEN = process.env.MP_ACCESS_TOKEN || 'APP_USR-1603783113978504-062408-d67a1021538897e0341f70bb7645fdcf-2669863266'

// Valores de teste — trocar para produção: VALOR_AVISTA=5000, VALOR_RECORRENTE=833
const VALOR_AVISTA = 25.00
const VALOR_RECORRENTE = 5.00

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET — valida token e retorna nome do lead para exibir na página
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ valido: false })

  const { data: lead } = await supabase
    .from('leads')
    .select('nome, tentativas_pagamento')
    .eq('payment_token', token)
    .single()

  if (!lead) return NextResponse.json({ valido: false })
  return NextResponse.json({ valido: true, nome: lead.nome })
}

// POST — tokeniza no servidor e cobra (sem SDK no cliente)
// metodo: 'avista' | 'recorrente'
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, metodo, email, cardNumber, cardholderName, cardExpirationMonth, cardExpirationYear, securityCode, identificationType, identificationNumber, installments } = body
  console.log('[pagar] POST iniciado', { metodo, temToken: !!token, temCardNumber: !!cardNumber, installments })

  if (!token || !cardNumber) {
    return NextResponse.json({ aprovado: false, mensagem: 'Dados incompletos.' }, { status: 400 })
  }

  const cardPayload = {
    card_number: cardNumber,
    expiration_year: cardExpirationYear,
    expiration_month: cardExpirationMonth,
    security_code: securityCode,
    cardholder: {
      name: cardholderName,
      identification: { type: identificationType || 'CPF', number: identificationNumber },
    },
  }

  const tokenResp = await fetch('https://api.mercadopago.com/v1/card_tokens', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${MP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cardPayload),
  }).then(r => r.json()).catch(() => null)

  if (!tokenResp?.id) {
    const causa = tokenResp?.cause?.[0]?.description || tokenResp?.error || 'dados inválidos'
    console.log('[pagar] Erro ao tokenizar:', causa)
    return NextResponse.json({ aprovado: false, mensagem: `Cartão recusado: ${causa}` }, { status: 400 })
  }

  const cardToken = tokenResp.id
  const paymentMethodId = tokenResp.payment_method_id || ''
  const issuerId = tokenResp.issuer_id ? String(tokenResp.issuer_id) : ''

  const leadResult = await Promise.race([
    supabase.from('leads').select('id, telefone, tentativas_pagamento').eq('payment_token', token).single(),
    new Promise<{ data: null; error: string }>(resolve => setTimeout(() => resolve({ data: null, error: 'timeout' }), 2500))
  ])

  const lead = (leadResult as any).data as { id: string; telefone: string; tentativas_pagamento: number } | null
  console.log('[pagar] Lead encontrado:', !!lead)
  if (!lead) {
    return NextResponse.json({ aprovado: false, mensagem: 'Link inválido ou expirado.' }, { status: 400 })
  }

  const tentativas = lead.tentativas_pagamento || 0
  const telefone = lead.telefone
  const payerEmail = email || 'pagador@hormoneecosystem.com'

  supabase.from('leads').update({ tentativas_pagamento: tentativas + 1 }).eq('id', lead.id).then(() => {})

  if (metodo === 'recorrente') {
    // Criar preapproval para todas as 6 parcelas — MP cobra automaticamente
    const result = await criarAssinatura({ cardToken, payerEmail, telefone, leadId: lead.id })
    console.log('[pagar] Preapproval recorrente:', result)

    if (result.criado) {
      supabase.from('pagamentos_recorrentes').insert({
        lead_id: lead.id,
        lead_telefone: telefone,
        preapproval_id: result.preapprovalId,
        card_token: cardToken,
        payment_method_id: paymentMethodId,
        issuer_id: issuerId,
        valor: VALOR_RECORRENTE,
        parcelas_pagas: 0,
        parcelas_total: 6,
        proxima_cobranca: proximaData(),
        status: 'ativo',
      }).then(() => {})
      supabase.from('leads').update({ status_pagamento: 'pago' }).eq('id', lead.id).then(() => {})
      return NextResponse.json({ aprovado: true })
    }

    if (tentativas < 1) {
      return NextResponse.json({ aprovado: false, recuperacao: 'outro_cartao', _detalhe: result.detalhe })
    }
    supabase.from('leads').update({ status_pagamento: 'recuperacao_necessaria' }).eq('id', lead.id).then(() => {})
    return NextResponse.json({ aprovado: false, recuperacao: 'opcoes', _detalhe: result.detalhe })
  }

  // metodo === 'avista' (padrão)
  const qtdParcelas = Number(installments) || 1
  const p = await cobrarCartao({
    cardToken, paymentMethodId, issuerId, installments: qtdParcelas,
    valor: VALOR_AVISTA,
    descricao: 'Programa Hormonal Dr. Vinícius',
    telefone,
    metodo: 'cartao_avista',
    payerEmail,
  })
  if (p.aprovado) {
    registrarPagamento(telefone, p.paymentId!, 'cartao_avista', VALOR_AVISTA)
    supabase.from('leads').update({ status_pagamento: 'pago' }).eq('id', lead.id).then(() => {})
    return NextResponse.json({ aprovado: true })
  }
  return NextResponse.json({ aprovado: false, proxima: 'recorrente', _detalhe: p.detalhe })
}

async function criarAssinatura({ cardToken, payerEmail, telefone, leadId }: {
  cardToken: string; payerEmail: string; telefone: string; leadId: string
}): Promise<{ criado: boolean; preapprovalId?: string; detalhe?: string }> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 7000)

    // 6 parcelas: começa agora, termina após 6 cobranças
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 6)

    const payload = {
      reason: 'Programa Hormonal Dr. Vinícius — 6x R$8,34',
      payer_email: payerEmail,
      card_token_id: cardToken,
      back_url: 'https://www.hormoneecosystem.com',
      status: 'authorized',
      external_reference: telefone,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: VALOR_RECORRENTE,
        currency_id: 'BRL',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
    }

    console.log('[criarAssinatura] Criando preapproval para', telefone)
    const resp = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `assinatura-${leadId}`,
      },
      body: JSON.stringify(payload),
    })
    clearTimeout(timer)
    const data = await resp.json()
    console.log('[criarAssinatura] Resposta MP:', { status: data.status, id: data.id, error: data.error, message: data.message })

    const criado = data.status === 'authorized'
    const detalhe = data.error || data.message || data.status || ''
    return { criado, preapprovalId: String(data.id || ''), detalhe }
  } catch (err: any) {
    console.log('[criarAssinatura] Exceção:', err?.message || err)
    return { criado: false, detalhe: 'timeout' }
  }
}

async function cobrarCartao({ cardToken, paymentMethodId, issuerId, installments, valor, descricao, telefone, metodo, payerEmail }: {
  cardToken: string; paymentMethodId: string; issuerId: string
  installments: number; valor: number; descricao: string; telefone: string; metodo: string; payerEmail: string
}): Promise<{ aprovado: boolean; paymentId?: string; detalhe?: string }> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 6000)
    const payload: Record<string, any> = {
      transaction_amount: valor,
      token: cardToken,
      description: descricao,
      installments: installments || 1,
      payer: { email: payerEmail },
      metadata: { telefone, metodo },
      external_reference: telefone,
    }
    if (paymentMethodId) payload.payment_method_id = paymentMethodId
    if (issuerId) payload.issuer_id = Number(issuerId)
    console.log('[cobrarCartao] Enviando para MP:', { metodo, valor, payment_method_id: paymentMethodId })
    const resp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${telefone}-${metodo}-${Date.now()}`,
      },
      body: JSON.stringify(payload),
    })
    clearTimeout(timer)
    const data = await resp.json()
    console.log('[cobrarCartao] Resposta MP:', { status: data.status, id: data.id, status_detail: data.status_detail, error: data.error })
    const detalhe = data.status_detail || data.error || data.message || ''
    return { aprovado: data.status === 'approved', paymentId: String(data.id || ''), detalhe }
  } catch (err: any) {
    console.log('[cobrarCartao] Exceção:', err?.message || err)
    return { aprovado: false }
  }
}

function registrarPagamento(telefone: string, paymentId: string, metodo: string, valor: number) {
  supabase.from('pagamentos').insert({
    lead_telefone: telefone,
    payment_id: paymentId,
    metodo,
    valor,
    status: 'approved',
    parcelas: metodo === 'cartao_avista' ? 1 : 6,
    recorrente: metodo === 'cartao_recorrente',
  }).then(() => {})
}

function proximaData(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}
