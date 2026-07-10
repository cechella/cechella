import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text'
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'

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

    // Envia via Z-API
    const zapiResp = await fetch(ZAPI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
      body: JSON.stringify({ phone, message }),
    })
    if (!zapiResp.ok) {
      return NextResponse.json({ ok: false, error: 'Falha ao enviar Z-API' }, { status: 502 })
    }

    // Busca historico atual e adiciona mensagem do humano
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

    await supabase
      .from('leads')
      .update({ historico })
      .eq('id', leadId)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
