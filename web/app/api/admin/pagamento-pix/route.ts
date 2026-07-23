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
  const suffix = normalized.slice(-8)
  return { normalized, suffix }
}

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')
  if (!phone) return NextResponse.json({ ok: false, error: 'phone required' }, { status: 400 })

  const { normalized, suffix } = buildFilter(phone)

  // 1. Busca PIX na tabela pagamentos
  const { data: pixData } = await supabase
    .from('pagamentos')
    .select('pix_code, valor, status, expira_em, metodo, parcelas, created_at')
    .like('lead_telefone', `%${suffix}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // 2. Busca cartão via payment_token na tabela leads
  let checkoutUrl: string | null = null
  let leadMetodo: string | null = null

  const telefonesParaBuscar = [normalized, normalized.slice(0, 4) + normalized.slice(5), normalized.slice(0, 4) + '9' + normalized.slice(4)].filter(Boolean)
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

  // Retorna ambos se existirem
  if (!pixData?.pix_code && !checkoutUrl) {
    return NextResponse.json({ ok: true, pagamento: null })
  }

  return NextResponse.json({
    ok: true,
    pagamento: {
      pix_code: pixData?.pix_code || null,
      valor: pixData?.valor || null,
      status: pixData?.status || 'pending',
      metodo: pixData?.metodo || null,
      checkout_url: checkoutUrl || null,
    }
  })
}
