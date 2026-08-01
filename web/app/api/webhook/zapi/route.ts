import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const N8N_URL = 'https://n8n.hormoneecosystem.com/webhook/whatsapp-webhook'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ZAPI_SEND = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text'
const ZAPI_CLIENT_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'

async function zapiSend(phone: string, message: string) {
  await fetch(ZAPI_SEND, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_CLIENT_TOKEN },
    body: JSON.stringify({ phone, message }),
  })
}

async function saveReferidos(telefoneLead: string, contacts: Record<string, unknown>[]) {
  // Check M4 flag (post-NO leads limited to 4 referidos)
  const { data: lead } = await supabase
    .from('leads')
    .select('id, total_referidos, etapa, m4')
    .eq('telefone', telefoneLead)
    .maybeSingle()

  if (!lead) return

  const isM4 = lead.m4 === true
  const maxReferidos = isM4 ? 4 : 999

  let saved = 0
  for (const c of contacts) {
    const nomeReferido = String(c.displayName || c.name || '')
    const telefoneReferido = Array.isArray(c.phones)
      ? String((c.phones as Record<string, unknown>[])[0]?.phone || '')
      : String(c.phone || '')

    if (!telefoneReferido) continue

    // Check current total to respect M4 limit
    const { count } = await supabase
      .from('contatos_referidos')
      .select('id', { count: 'exact', head: true })
      .eq('telefone_lead', telefoneLead)

    if ((count || 0) >= maxReferidos) break

    // Dedup check
    const { data: existing } = await supabase
      .from('contatos_referidos')
      .select('id')
      .eq('telefone_lead', telefoneLead)
      .eq('telefone_referido', telefoneReferido)
      .maybeSingle()

    if (existing) continue

    await supabase.from('contatos_referidos').insert({
      telefone_lead: telefoneLead,
      nome_referido: nomeReferido,
      telefone_referido: telefoneReferido,
    })
    saved++
  }

  if (saved === 0) return

  // Update total_referidos
  const newTotal = (lead.total_referidos || 0) + saved
  await supabase.from('leads').update({ total_referidos: newTotal }).eq('id', lead.id)

  // When >= 20, send congratulations messages and mark
  if (newTotal >= 20) {
    const { data: alreadySent } = await supabase
      .from('contatos_referidos')
      .select('id')
      .eq('telefone_lead', telefoneLead)
      .eq('mensagem_enviada', true)
      .maybeSingle()

    if (!alreadySent) {
      await zapiSend(telefoneLead, '🎉 Parabéns! Você completou os 20 indicados!')
      await zapiSend(telefoneLead, '✅ Seu acesso ao Programa Hormonal está garantido. Em breve entraremos em contato para confirmar os detalhes.')
      await zapiSend(telefoneLead, '💪 Obrigado por confiar no Dr. Vinicius e indicar seus amigos!')

      await supabase
        .from('contatos_referidos')
        .update({ mensagem_enviada: true })
        .eq('telefone_lead', telefoneLead)
    }
  }
}

// Z-API sends all WhatsApp events here — we persist every message to mensagens_whatsapp AND forward to n8n
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Z-API multi-device payload structure
    const phone = body.phone || body.from || body.chatId?.replace('@s.whatsapp.net', '').replace('@c.us', '')
    if (!phone) return NextResponse.json({ ok: true })

    // Block ANA from responding when human attendance is active
    const fromMe = body.fromMe === true
    if (!fromMe) {
      const { data: lead } = await supabase
        .from('leads')
        .select('atendimento_humano')
        .eq('telefone', phone)
        .maybeSingle()

      if (lead?.atendimento_humano === true) {
        // Persist the message but do NOT forward to n8n — human is in control
        const ts = body.momentoMensagem
          ? new Date(body.momentoMensagem * 1000).toISOString()
          : new Date().toISOString()
        const type = body.type || 'text'
        let content = ''
        if (body.text?.message) content = body.text.message
        else if (body.image?.caption) content = `🖼️ ${body.image.caption}`
        else if (body.image) content = '🖼️ Imagem'
        else if (body.audio || body.ptt) content = '🎵 Áudio'
        else if (body.video?.caption) content = `📹 ${body.video.caption}`
        else if (body.video) content = '📹 Vídeo'
        else if (body.document) content = `📄 ${body.document.fileName || 'Documento'}`
        else if (typeof body.message === 'string') content = body.message
        if (content) {
          await supabase.from('mensagens_whatsapp').insert({ phone, role: 'user', content, type, ts, raw: body })
        }
        return NextResponse.json({ ok: true, blocked: 'human_attendance' })
      }
    }

    // Forward to n8n only when ANA is in control
    fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})

    const role = fromMe ? 'assistant' : 'user'
    const ts = body.momentoMensagem
      ? new Date(body.momentoMensagem * 1000).toISOString()
      : new Date().toISOString()

    // Extract content by type
    const type = body.type || 'text'
    let content = ''

    if (body.text?.message) content = body.text.message
    else if (body.image?.caption) content = `🖼️ ${body.image.caption}`
    else if (body.image) content = '🖼️ Imagem'
    else if (body.audio || body.ptt) content = '🎵 Áudio'
    else if (body.video?.caption) content = `📹 ${body.video.caption}`
    else if (body.video) content = '📹 Vídeo'
    else if (body.document) content = `📄 ${body.document.fileName || 'Documento'}`
    else if (body.sticker) content = '🎭 Sticker'
    else if (body.location) content = `📍 Localização: ${body.location.name || ''}`
    else if (body.contacts?.length) {
      content = body.contacts.map((c: Record<string, unknown>) => {
        const name = String(c.displayName || c.name || '')
        const phones = Array.isArray(c.phones)
          ? (c.phones as Record<string, unknown>[]).map(p => String(p.phone || '')).join(', ')
          : String(c.phone || '')
        return `📇 ${name}${phones ? ` — ${phones}` : ''}`
      }).join('\n')

      // Save referidos to Supabase when contacts arrive from a lead (not fromMe)
      if (!fromMe) {
        saveReferidos(phone, body.contacts as Record<string, unknown>[]).catch(() => {})
      }
    }
    else if (body.contact) {
      const c = body.contact as Record<string, unknown>
      content = `📇 ${String(c.displayName || c.name || '')}`
    }
    else if (body.listResponse) content = `📋 ${body.listResponse.title || body.listResponse.description || 'Resposta de lista'}`
    else if (body.buttonsResponseMessage) content = `🔘 ${body.buttonsResponseMessage.selectedDisplayText || 'Botão selecionado'}`
    else if (typeof body.message === 'string') content = body.message
    else content = `[${type}]`

    if (!content) return NextResponse.json({ ok: true })

    await supabase.from('mensagens_whatsapp').insert({
      phone,
      role,
      content,
      type,
      ts,
      raw: body,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // always 200 so Z-API doesn't retry
  }
}

// Z-API health-check
export async function GET() {
  return NextResponse.json({ ok: true, service: 'zapi-webhook' })
}
