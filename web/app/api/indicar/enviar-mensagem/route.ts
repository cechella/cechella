import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ZAPI_BASE = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5'
const ZAPI_CLIENT_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'

const zapiText = async (phone: string, message: string) => {
  const res = await fetch(`${ZAPI_BASE}/send-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_CLIENT_TOKEN },
    body: JSON.stringify({ phone, message }),
  })
  return res.json()
}

const zapiContact = async (phone: string, contactName: string, contactPhone: string) => {
  const res = await fetch(`${ZAPI_BASE}/send-contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_CLIENT_TOKEN },
    body: JSON.stringify({ phone, contactName, contactPhone }),
  })
  return res.json()
}

export async function POST(req: NextRequest) {
  try {
    const { token, telefone_referido } = await req.json()
    if (!token || !telefone_referido) {
      return NextResponse.json({ error: 'token e telefone_referido obrigatórios' }, { status: 400 })
    }

    const { data: lead } = await supabase
      .from('leads')
      .select('nome, telefone')
      .eq('token_indicacao', token)
      .single()

    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

    const nomeFirst = lead.nome?.split(' ')[0] || 'Sua amiga'
    const nomeLead = lead.nome || 'Sua amiga'
    const telReferido = telefone_referido.replace(/\D/g, '')

    const mensagem =
      `Oi! Tudo bem? 😊\n` +
      `Acabei de fazer uma coisa incrível pela minha saúde e pensei em você! Uma consultora chamada Ana do Hormone Ecosystem vai entrar em contato com você — vale muito a pena ouvir! 🌸\n` +
      `Ela vai te ligar do número +55 17 2786-2778 — pode atender com tranquilidade! 📞\n\n` +
      `essa mensagem foi enviada a meu pedido`

    await zapiText(telReferido, mensagem)

    await new Promise(r => setTimeout(r, 1500))

    const nomeCard = `${nomeLead} "Fui eu que te indiquei! ❤️ Qualquer dúvida me chama"`
    await zapiContact(telReferido, nomeCard, lead.telefone)

    await supabase
      .from('contatos_referidos')
      .update({ status: 'mensagem_enviada', mensagem_enviada: true })
      .eq('indicado_por_telefone', lead.telefone)
      .eq('telefone', telReferido)

    return NextResponse.json(
      { ok: true },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
