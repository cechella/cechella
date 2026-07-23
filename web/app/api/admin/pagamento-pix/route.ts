import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const SITE_URL = 'https://www.hormoneecosystem.com'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function buildFilter(phone: string) {
  const normalized = phone.replace(/\D/g, '')
  let alt: string | null = null
  if (normalized.length === 13 && normalized.startsWith('55')) {
    alt = normalized.slice(0, 4) + normalized.slice(5)
  } else if (normalized.length === 12 && normalized.startsWith('55')) {
    alt = normalized.slice(0, 4) + '9' + normalized.slice(4)
  }
  return { normalized, alt }
}

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) return NextResponse.json({ ok: false, error: 'phone required' }, { status: 400 })

  const { normalized, alt } = buildFilter(phone)

  // 1. Busca PIX na tabela pagamentos
  const pixFilter = alt
    ? `lead_telefone.eq.${normalized},lead_telefone.eq.${alt}`
    : `lead_telefone.eq.${normalized}`

  const { data: pixData } = await supabase
    .from('pagamentos')
    .select('pix_code, valor, status, expira_em, metodo, parcelas, created_at')
    .or(pixFilter)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // 2. Busca cartão via payment_token na tabela leads
  const telefonesParaBuscar = alt ? [normalized, alt] : [normalized]
  let checkoutUrl: string | null = null
  let leadMetodo: string | null = null

  for (const tel of telefonesParaBuscar) {
    const { data: leadData } = await supabase
      .from('leads')
      .select('payment_token, metodo_pagamento')
      .eq('telefone', tel)
      .limit(1)
      .single()

    if (leadData?.payment_token) {
      checkoutUrl = `${SITE_URL}/pagar/${leadData.payment_token}`
      leadMetodo = leadData.metodo_pagamento || 'cartao'
      break
    }
  }

  // Retorna PIX se existir, senão cartão, senão null
  if (pixData?.pix_code) {
    return NextResponse.json({ ok: true, pagamento: { ...pixData, checkout_url: null } })
  }

  if (checkoutUrl) {
    return NextResponse.json({ ok: true, pagamento: { metodo: leadMetodo, checkout_url: checkoutUrl, pix_code: null, status: 'pending', valor: null } })
  }

  return NextResponse.json({ ok: true, pagamento: null })
}
