// Meta Cloud API — envio de mensagens WhatsApp pelo número do André
// Número: +55 47 8850-7977 | Phone Number ID: 535564639640424

const ANDRE_PHONE_ID = process.env.ANDRE_PHONE_NUMBER_ID || '535564639640424'
const ANDRE_TOKEN    = process.env.META_ANDRE_ACCESS_TOKEN!
const META_API       = 'https://graph.facebook.com/v20.0'

function normalizePhone(tel: string): string {
  const digits = tel.replace(/\D/g, '')
  return digits.startsWith('55') ? digits : `55${digits}`
}

export async function metaSendText(telefone: string, message: string): Promise<boolean> {
  const to = normalizePhone(telefone)
  const res = await fetch(`${META_API}/${ANDRE_PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANDRE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message },
    }),
  })
  return res.ok
}

export async function metaSendDocument(telefone: string, url: string, filename: string, caption?: string): Promise<boolean> {
  const to = normalizePhone(telefone)
  const res = await fetch(`${META_API}/${ANDRE_PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ANDRE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'document',
      document: { link: url, filename, caption: caption ?? '' },
    }),
  })
  return res.ok
}
