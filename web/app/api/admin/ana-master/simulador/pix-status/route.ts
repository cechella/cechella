import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(req: NextRequest) {
  try {
    const paymentId = req.nextUrl.searchParams.get('paymentId')
    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId obrigatório' }, { status: 400 })
    }

    const { data } = await supabase
      .from('pagamentos')
      .select('payment_id, status, metodo, pix_code, expira_em, valor')
      .eq('payment_id', paymentId)
      .maybeSingle()

    if (!data) {
      return NextResponse.json({ found: false })
    }

    const paid = data.status === 'approved' || data.status === 'paid'
    const expired = data.expira_em ? new Date(data.expira_em) < new Date() : false

    return NextResponse.json({
      found: true,
      paid,
      expired,
      status: data.status,
      payment_id: data.payment_id,
      metodo: data.metodo,
      valor: data.valor,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
