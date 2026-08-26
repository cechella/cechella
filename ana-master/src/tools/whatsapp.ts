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
  const webhookAlreadySent = !!token // webhook sets token before sending video
  if (!token) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    token = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    await supabase.from('leads').update({ token_indicacao: token }).eq('id', lead.id)
  }

  const link = `${APP_URL}/indicar/${token}`

  // Skip WhatsApp send if webhook already sent the video (token was already set by webhook)
  if (webhookAlreadySent) return { link, token }

  const phone = normalizePhone(telefone)
  const TUTORIAL_VIDEO_URL = 'https://pub-7091151189544b0980e12e81533a5213.r2.dev/tutorialwpp.mp4'
  const caption =
    `✅ Código recebido!\n\n` +
    `1️⃣ Toque no + à esquerda\n` +
    `2️⃣ Escolha Contato\n` +
    `3️⃣ Busque e selecione suas amigas\n` +
    `4️⃣ Toque em Enviar\n\n` +
    `Você pode selecionar várias de uma vez! 💜\n\n` +
    `👉 ${link}`

  let enviou = false
  try {
    const r = await fetch(`${ZAPI_BASE}/send-video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_CLIENT_TOKEN },
      body: JSON.stringify({ phone, video: TUTORIAL_VIDEO_URL, caption }),
    })
    enviou = r.ok
  } catch { /* fallback abaixo */ }

  if (!enviou) {
    await zapiPost('send-text', { phone, message: caption })
  }

  return { link, token }
}
