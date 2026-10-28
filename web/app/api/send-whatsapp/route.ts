import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { metaSendText } from '@/lib/meta-whatsapp'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const { phone, message, leadId } = await req.json()
    if (!phone || !message || !leadId) {
      return NextResponse.json({ ok: false, error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    const ok = await metaSendText(phone, message)
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Falha ao enviar via Meta API' }, { status: 502 })
    }

    const { data: lead } = await supabase
      .from('leads')
      .select('historico')
      .eq('id', leadId)
      .single()

    const historico = Array.isArray(lead?.historico) ? lead.historico : []
    historico.push({
      role: 'assistant',
      content: `[Humano] ${message}`,
      ts: new Date().toISOString(),
    })

    await supabase.from('leads').update({ historico }).eq('id', leadId)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
