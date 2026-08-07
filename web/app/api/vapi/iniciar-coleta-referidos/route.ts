import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ZAPI_BASE = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5'
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'
const ZAPI_VIDEO_URL = `${ZAPI_BASE}/send-video`
const ZAPI_TEXT_URL = `${ZAPI_BASE}/send-text`
const TUTORIAL_VIDEO_URL = 'https://pub-7091151189544b0980e12e81533a5213.r2.dev/tutorialwpp.mp4'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.hormoneecosystem.com'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    let telefone: string | undefined

    if (body.message?.type === 'tool-calls') {
      telefone = body.message.call?.customer?.number || body.message.call?.phoneNumber?.number
    } else if (body.message?.type === 'function-call') {
      telefone = body.message.call?.customer?.number || body.message.call?.phoneNumber?.number
    } else {
      telefone = body.telefone
    }

    // Fallback: most recent active call
    if (!telefone || String(telefone).replace(/\D/g, '').length < 8) {
      const since = new Date(Date.now() - 5 * 60 * 1000).toISOString()
      const { data: activeCall } = await supabase
        .from('historico_voz')
        .select('telefone')
        .is('duracao_segundos', null)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (activeCall?.telefone) telefone = activeCall.telefone
    }

    if (!telefone || String(telefone).replace(/\D/g, '').length < 8) {
      return NextResponse.json({ result: 'Erro: telefone não encontrado.' })
    }

    const digits = String(telefone).replace(/\D/g, '')

    // ── GUARDA CRÍTICA: pagamento DEVE estar confirmado ──────────────────────
    const { data: lead } = await supabase
      .from('leads')
      .select('id, status_pagamento, token_indicacao, nome')
      .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)
      .maybeSingle()

    if (!lead) {
      return NextResponse.json({ result: 'Lead não encontrado.' })
    }

    if (lead.status_pagamento !== 'pago') {
      // Pagamento não confirmado — BLOQUEIA o envio do link
      return NextResponse.json({
        result: 'PAGAMENTO NÃO CONFIRMADO. Não envie o link de indicações ainda. Aguarde a confirmação do pagamento e tente novamente.',
        confirmado: false,
        bloqueado: true,
      })
    }

    // ── Pagamento confirmado — garante token e envia link ────────────────────
    let token = lead.token_indicacao
    if (!token) {
      const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
      token = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
      await supabase.from('leads').update({ token_indicacao: token }).eq('id', lead.id)
    }

    const link = `${APP_URL}/indicar/${token}`
    const nome = lead.nome || 'você'
    const phone = digits.startsWith('55') ? digits : `55${digits}`

    // Envia vídeo tutorial com o link
    try {
      await fetch(ZAPI_VIDEO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
        body: JSON.stringify({
          phone,
          video: TUTORIAL_VIDEO_URL,
          caption:
            `✨ Oi você! 😊 Aqui é a Ana — estamos em ligação agora mesmo!\n\n` +
            `Vou te passar seu link especial de indicações. 💜\n\n` +
            `👉 ${link}\n\n` +
            `Nele você indica suas amigas, preenche profissão e hobby de cada uma e acompanha seu progresso até as 20. Guarda esse link! 💜`,
        }),
      })
    } catch {
      // Se vídeo falhar, envia texto simples
      await fetch(ZAPI_TEXT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
        body: JSON.stringify({
          phone,
          message:
            `✨ Oi você! 😊 Aqui é a Ana — estamos em ligação agora mesmo!\n\n` +
            `Vou te passar seu link especial de indicações. 💜\n\n` +
            `👉 ${link}\n\n` +
            `Nossa meta são 20 amigas — o sistema avisa quando chegar lá. Pode começar! 💜`,
        }),
      })
    }

    return NextResponse.json({
      result: `Link de indicações enviado no WhatsApp de ${nome}. Link: ${link}`,
      confirmado: true,
      token,
    })
  } catch (err: any) {
    console.error('iniciar-coleta-referidos error:', err)
    return NextResponse.json({ result: 'Erro ao iniciar coleta de referidos.' })
  }
}
