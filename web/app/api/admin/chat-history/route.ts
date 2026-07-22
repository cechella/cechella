import { NextRequest, NextResponse } from 'next/server'

const ZAPI_INSTANCE = '3F4D4A5044DBE1E458808A5553EDB71F'
const ZAPI_TOKEN_PATH = '039297EE5982433C7EFA38C5'
const ZAPI_CLIENT_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'
const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN_PATH}`

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get('phone')
  const count = req.nextUrl.searchParams.get('count') || '100'

  if (!phone) return NextResponse.json({ ok: false, error: 'phone required' }, { status: 400 })

  // Normalize phone: Z-API expects format like 5511999999999 (country code + number, no +)
  const normalized = phone.replace(/\D/g, '').replace(/^0/, '')

  try {
    const resp = await fetch(
      `${ZAPI_BASE}/chat-messages/${normalized}?count=${count}`,
      { headers: { 'Client-Token': ZAPI_CLIENT_TOKEN } }
    )

    if (!resp.ok) {
      const text = await resp.text()
      return NextResponse.json({ ok: false, error: text }, { status: resp.status })
    }

    const data = await resp.json()
    // Z-API returns array of messages; normalize to our chat format
    const messages = Array.isArray(data) ? data : (data.messages || data.chats || [])

    const normalized_msgs = messages.map((m: Record<string, unknown>) => {
      const fromMe = m.fromMe as boolean | undefined
      const role = fromMe ? 'assistant' : 'user'
      // Extract text content from different message types
      let content = ''
      if (typeof m.text === 'string') content = m.text
      else if (m.body && typeof m.body === 'string') content = m.body
      else if (m.caption && typeof m.caption === 'string') content = m.caption
      else if (m.type === 'contact' || m.type === 'contactArray') {
        const contacts = (m.contacts as Record<string, unknown>[] | undefined) || (m.contact ? [m.contact] : [])
        if (contacts.length > 0) {
          content = contacts.map((c: Record<string, unknown>) => {
            const name = (c.displayName || c.name || '') as string
            const phones = Array.isArray(c.phones)
              ? (c.phones as Record<string, unknown>[]).map((p: Record<string, unknown>) => p.phone || p.wa_id || '').join(', ')
              : (c.phone || '') as string
            return `📇 ${name}${phones ? ` — ${phones}` : ''}`
          }).join('\n')
        } else {
          content = '[Contato]'
        }
      } else if (m.type === 'image') {
        content = `🖼️ Imagem${m.caption ? `: ${m.caption}` : ''}`
      } else if (m.type === 'audio' || m.type === 'ptt') {
        content = '🎵 Áudio'
      } else if (m.type === 'video') {
        content = `📹 Vídeo${m.caption ? `: ${m.caption}` : ''}`
      } else if (m.type === 'document') {
        content = `📄 Documento${m.fileName ? `: ${m.fileName}` : ''}`
      } else if (m.type === 'sticker') {
        content = '🎭 Sticker'
      } else if (m.type === 'location') {
        content = '📍 Localização'
      } else {
        content = String(m.text || m.body || m.caption || m.type || '[mensagem]')
      }

      const ts = m.timestamp
        ? new Date((m.timestamp as number) * 1000).toISOString()
        : (m.time as string | undefined) || undefined

      return { role, content, ts, type: m.type || 'text', fromMe }
    })

    return NextResponse.json({ ok: true, messages: normalized_msgs })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
