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

// Fornecedores — lidos do Supabase (configuracoes.fornecedores), fallback hardcoded
async function getFornecedores() {
  const { data } = await supabase.from('configuracoes').select('valor').eq('chave', 'fornecedores').maybeSingle()
  const f = (data?.valor as Record<string, string> | null) ?? {}
  return {
    bios_leandro: f.bios_leandro ?? '5548992233296',
    mikit:        f.mikit        ?? '5548988405443',
    mk_health:    f.mk_health    ?? '5547932052958',
  }
}

export async function pedidoMikit(paciente: string, qtdKits: number, tamanhoLuva: string, tamTrocater: string, enderecoEntrega: string) {
  const { mikit: phone } = await getFornecedores()
  const message =
    `Olá! Sou André, assistente do Dr. Vinícius Cechella.\n\n` +
    `*Pedido de Kit — ${paciente}*\n\n` +
    `• Kit Duas Inserções com Trocater\n` +
    `• Qtd: ${qtdKits} kit(s)\n` +
    `• Luvas: ${tamanhoLuva}\n` +
    `• Trocaters: ${tamTrocater}mm\n\n` +
    `*Endereço de entrega:*\n${enderecoEntrega}\n\n` +
    `Por favor, confirme disponibilidade e prazo. Frete PAC por conta do destinatário. 🙏`
  return zapiPost('send-text', { phone, message })
}

export async function pedidoBios(paciente: string, prescricao: string[], enderecoEntrega: string) {
  const { bios_leandro: phone } = await getFornecedores()
  const itens = prescricao.map(i => `• ${i}`).join('\n')
  const message =
    `Olá Leandro! Sou André, assistente do Dr. Vinícius Cechella.\n\n` +
    `*Pedido de manipulação — ${paciente}*\n\n` +
    `${itens}\n\n` +
    `*Endereço de entrega:*\n${enderecoEntrega}\n\n` +
    `Desconto padrão 20%. Por favor, confirme orçamento e prazo. 🙏`
  return zapiPost('send-text', { phone, message })
}

export async function reservarSalaMK(data: string, horarioInicio: string, horarioFim: string, qtdPacientes: number) {
  const { mk_health: phone } = await getFornecedores()
  const message =
    `Olá! Sou André, assistente do Dr. Vinícius Cechella.\n\n` +
    `Gostaria de reservar a sala para procedimentos:\n\n` +
    `📅 *Data:* ${data}\n` +
    `🕐 *Horário:* ${horarioInicio} às ${horarioFim}\n` +
    `👥 *Pacientes:* ${qtdPacientes}\n\n` +
    `Por favor, confirme disponibilidade e envie a chave PIX para pagamento. 🙏`
  return zapiPost('send-text', { phone, message })
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
    const { error: tokenErr } = await supabase.from('leads').update({ token_indicacao: token }).eq('id', lead.id)
    if (tokenErr) console.error('[REFERIDOS] falha ao salvar token_indicacao:', tokenErr.message, '| token:', token)
  }

  const link = `${APP_URL}/indicar/${token}`

  // Registra sessão diretamente no banco — elimina necessidade do REF-TOKEN manual via WhatsApp.
  // n8n já busca token por telefone em sessao_wpp; com isso, a lead pode compartilhar contatos
  // sem precisar enviar nenhuma mensagem de texto antes.
  const phoneNorm = normalizePhone(telefone)
  supabase.from('sessao_wpp')
    .upsert({ phone: phoneNorm, token }, { onConflict: 'phone' })
    .then(({ error }) => {
      if (error) console.error('[REFERIDOS] falha ao registrar sessao_wpp:', error.message)
      else console.log(`[REFERIDOS] sessao_wpp registrada phone=${phoneNorm} token=${token}`)
    })

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
