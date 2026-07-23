import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const N8N_URL = 'https://n8n.hormoneecosystem.com/webhook/whatsapp-webhook'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Z-API sends all WhatsApp events here — we persist every message to mensagens_whatsapp AND forward to n8n
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Forward to n8n in parallel (fire-and-forget, don't block)
    fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {})

    // Z-API multi-device payload structure
    const phone = body.phone || body.from || body.chatId?.replace('@s.whatsapp.net', '').replace('@c.us', '')
    if (!phone) return NextResponse.json({ ok: true })

    const fromMe = body.fromMe === true
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
