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

// Z-API omits the 9th digit for some carriers: 554888416899 → 5548988416899
function normalizarTelefone(phone: string): string {
  if (/^\d{12}$/.test(phone) && phone.startsWith('55')) {
    const ddd = phone.substring(2, 4)
    const numero = phone.substring(4)
    if (numero.length === 8) return '55' + ddd + '9' + numero
  }
  return phone
}

async function saveReferidos(telefoneLead: string, contacts: Record<string, unknown>[]) {
  // Use normalized phone to find lead, but keep raw phone for contatos_referidos
  // so Ana Mensagem "Parsear Referidos" (which uses telefoneRaw) can still find them
  const telefoneNorm = normalizarTelefone(telefoneLead)
  const { data: lead } = await supabase
    .from('leads')
    .select('id, total_referidos')
    .eq('telefone', telefoneNorm)
    .maybeSingle()

  if (!lead) return

  const maxReferidos = 999

  let saved = 0
  for (const c of contacts) {
    const nomeReferido = String(c.displayName || c.name || '')
    // Z-API phones is string[] (e.g. ["5548..."]), not object[]
    const telefoneReferido = Array.isArray(c.phones)
      ? String((c.phones as string[])[0] || '')
      : String(c.phone || '')

    if (!telefoneReferido) continue

    // Check current total to respect M4 limit
    const { count } = await supabase
      .from('contatos_referidos')
      .select('id', { count: 'exact', head: true })
      .eq('indicado_por_telefone', telefoneLead)

    if ((count || 0) >= maxReferidos) break

    // Dedup check
    const { data: existing } = await supabase
      .from('contatos_referidos')
      .select('id')
      .eq('indicado_por_telefone', telefoneLead)
      .eq('telefone', telefoneReferido)
      .maybeSingle()

    if (existing) continue

    await supabase.from('contatos_referidos').insert({
      indicado_por_telefone: telefoneLead,
      nome: nomeReferido,
      telefone: telefoneReferido,
      fonte: 'zapi',
      tipo_envio: 'contato_whatsapp',
      status: 'aguardando',
    })
    saved++
  }

  if (saved === 0) return

  // Update total_referidos
  const previousTotal = lead.total_referidos || 0
  const newTotal = previousTotal + saved
  await supabase.from('leads').update({ total_referidos: newTotal }).eq('id', lead.id)

  const meta = 20

  if (newTotal >= meta && previousTotal < meta) {
    // Trigger n8n etapa 7 to handle the transition (forwarding instructions + etapa 8 advance)
    // Etapa 7 node in Ana Mensagem handles: send forwarding message, mark contacts, then profissão/hobby form
    fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: normalizarTelefone(telefoneLead),
        type: 'text',
        text: { message: '[[20_REFERIDOS_ATINGIDO]]' },
        _trigger: 'meta_referidos',
      }),
    }).catch(() => {})
  } else if (newTotal < meta) {
    const faltam = meta - newTotal
    await zapiSend(
      telefoneLead,
      `✅ Recebi ${saved} contato${saved > 1 ? 's' : ''}! Você já tem ${newTotal} de ${meta} indicadas.\n💜 Faltam apenas ${faltam} para garantir seu acesso — continue enviando!`
    )
  }
}

// Z-API sends all WhatsApp events here — we persist every message to mensagens_whatsapp AND forward to n8n
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Z-API multi-device payload structure
    const phoneRaw = body.phone || body.from || body.chatId?.replace('@s.whatsapp.net', '').replace('@c.us', '')
    if (!phoneRaw) return NextResponse.json({ ok: true })
    // Normalize for Supabase lookups (Z-API omits 9th digit for some carriers)
    const phone = normalizarTelefone(phoneRaw)

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

    // Block n8n if lead is currently in a voice call (em_ligacao)
    const { data: leadVoz } = await supabase
      .from('leads')
      .select('em_ligacao')
      .eq('telefone', phone)
      .maybeSingle()

    if (leadVoz?.em_ligacao === true) {
      // Lead is in a voice call — save contacts/messages but don't trigger Ana WhatsApp
      const ts2 = body.momentoMensagem
        ? new Date(body.momentoMensagem * 1000).toISOString()
        : new Date().toISOString()
      const type2 = body.type || 'text'
      let content2 = ''
      if (body.text?.message) content2 = body.text.message
      else if (body.contactArray?.length || body.contacts?.length) {
        const contactList2 = (body.contactArray || body.contacts) as Record<string, unknown>[]
        content2 = contactList2.map((c) => `📇 ${String(c.displayName || c.name || '')}`).join('\n')
        await saveReferidos(phone, contactList2)
      }
      if (content2) {
        await supabase.from('mensagens_whatsapp').insert({ phone, role: 'user', content: content2, type: type2, ts: ts2, raw: body })
      }
      return NextResponse.json({ ok: true, blocked: 'em_ligacao' })
    }

    // Intercept text messages when lead is in etapa 7 (referidos) or etapa 8 (validacao)
    // Ana Mensagem doesn't handle text in these etapas — it restarts the flow
    if (!fromMe) {
      const isTextMsg = !!(body.text?.message)
      const isContact = !!(body.contactArray?.length || body.contacts?.length)

      if (isTextMsg && !isContact) {
        const { data: leadEtapa } = await supabase
          .from('leads')
          .select('etapa_agente, total_referidos')
          .eq('telefone', phone)
          .maybeSingle()

        // Only intercept when still collecting referidos (< 20)
        // When total >= 20, let n8n handle the transition (forwarding confirmation → profissao/hobby)
        if (leadEtapa?.etapa_agente === 7 && (leadEtapa?.total_referidos || 0) < 20) {
          // Save message but don't forward to n8n — respond with vCard reminder
          const tsE7 = body.momentoMensagem ? new Date(body.momentoMensagem * 1000).toISOString() : new Date().toISOString()
          await supabase.from('mensagens_whatsapp').insert({ phone, role: 'user', content: body.text.message, type: 'text', ts: tsE7, raw: body })
          await zapiSend(phoneRaw,
            '📲 Para me enviar os contatos, siga estes passos:\n\n' +
            '*Se você tem iPhone:*\n' +
            '1️⃣ Olha abaixo da caixa de texto — botão com sinal de + no lado esquerdo\n' +
            '2️⃣ Clica em "Contato"\n' +
            '3️⃣ Seleciona até 10 amigas\n' +
            '4️⃣ Clica em "Avançar" → "Enviar" e pronto! 🎉\n\n' +
            '*Se você tem Android:*\n' +
            '1️⃣ Clipe 📎 no lado esquerdo\n' +
            '2️⃣ Clica em "Contato"\n' +
            '3️⃣ Seleciona as amigas → "Enviar" e pronto! 🎉\n\n' +
            'Manda quantas quiser — vou recebendo! 🥳'
          )
          return NextResponse.json({ ok: true, handled: 'etapa7_text' })
        }
      }
    }

    // Forward to n8n with normalized phone so Ana Mensagem finds the lead correctly
    const bodyToForward = { ...body, phone }
    fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyToForward),
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
    else if (body.contactArray?.length || body.contacts?.length) {
      // Z-API uses contactArray; some other formats use contacts
      const contactList = (body.contactArray || body.contacts) as Record<string, unknown>[]
      content = contactList.map((c) => {
        const name = String(c.displayName || c.name || '')
        const phone = Array.isArray(c.phones)
          ? String((c.phones as string[])[0] || '')
          : String(c.phone || '')
        return `📇 ${name}${phone ? ` — ${phone}` : ''}`
      }).join('\n')

      if (!fromMe) {
        await saveReferidos(phone, contactList)
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
