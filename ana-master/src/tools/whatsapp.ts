import { ZAPI_BASE, ZAPI_CLIENT_TOKEN, APP_URL } from '../config.js'
import { supabase } from '../supabase.js'

async function zapiPost(endpoint: string, body: unknown) {
  const resp = await fetch(`${ZAPI_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_CLIENT_TOKEN },
    body: JSON.stringify(body),
  })
  return resp.ok
}

function normalizePhone(telefone: string) {
  const digits = String(telefone).replace(/\D/g, '')
  return digits.startsWith('55') ? digits : `55${digits}`
}

export async function sendWhatsApp(telefone: string, mensagem: string) {
  const phone = normalizePhone(telefone)
  await zapiPost('send-text', { phone, message: mensagem })
}

export async function sendWelcome(telefone: string) {
  const phone = normalizePhone(telefone)
  const mensagem =
    `🎉 Bem-vinda à família Hormone Ecosystem!\n\n` +
    `Você completou todas as etapas com sucesso. Seu procedimento está confirmado.\n\n` +
    `Em breve nossa equipe entrará em contato para os próximos passos. 💜`
  await zapiPost('send-text', { phone, message: mensagem })
}

export async function iniciarColetaReferidos(telefone: string): Promise<{ link: string; token: string } | null> {
  const digits = String(telefone).replace(/\D/g, '')

  const { data: lead } = await supabase
    .from('leads')
    .select('id, status_pagamento, token_indicacao, nome')
    .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)
    .maybeSingle()

  if (!lead || lead.status_pagamento !== 'pago') return null

  let token = lead.token_indicacao as string | null
  if (!token) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    token = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    await supabase.from('leads').update({ token_indicacao: token }).eq('id', lead.id)
  }

  const link = `${APP_URL}/indicar/${token}`
  const phone = normalizePhone(telefone)

  await zapiPost('send-text', {
    phone,
    message:
      `✨ Seu link especial de indicações chegou! 💜\n\n` +
      `👉 ${link}\n\n` +
      `Nossa meta são 20 amigas — o sistema avisa quando chegar lá. Pode começar! 💜`,
  })

  return { link, token }
}
