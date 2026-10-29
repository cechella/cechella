// Ponte entre a Meta Cloud API e o fluxo de 8 etapas do N8N, que foi feito para a Z-API.
// Entrada: mensagem da Meta -> formato ReceivedCallback da Z-API -> webhook do N8N.
// Saída: o N8N chama /zapi/instances/:i/token/:t/send-text (imitando a Z-API) -> envio pela Meta.
// Fora da janela de 24h a Meta recusa texto livre: a mensagem fica pendente, vai um template
// de retomada, e as pendentes são entregues assim que o lead responder.
import { supabase } from './supabase.js'
import { META_ANDRE_PHONE_ID, META_ANDRE_TOKEN } from './config.js'

const GRAPH = 'https://graph.facebook.com/v20.0'
const N8N_WEBHOOK_URL = process.env.N8N_WHATSAPP_WEBHOOK_URL ?? 'http://localhost:5678/webhook/whatsapp-webhook'
const TEMPLATE_RETOMADA = process.env.WHATSAPP_TEMPLATE_RETOMADA ?? 'ana_retomar_conversa'
const TEMPLATE_IDIOMA = process.env.WHATSAPP_TEMPLATE_IDIOMA ?? 'pt_BR'
const JANELA_FECHADA = new Set([131047, 131026, 470])   // fora da janela de 24h / reengajamento
const TEMPLATE_INTERVALO_MS = 20 * 3600_000

export function engineN8n(): boolean {
  return process.env.WHATSAPP_ENGINE === 'n8n'
}

export function digits(phone: string): string {
  return String(phone ?? '').replace(/\D/g, '')
}

// ── Saída ─────────────────────────────────────────────────────────────────────

type MetaResult = { ok: true; id: string } | { ok: false; code: number; message: string }

async function metaPost(body: Record<string, unknown>): Promise<MetaResult> {
  try {
    const res = await fetch(`${GRAPH}/${META_ANDRE_PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${META_ANDRE_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
    })
    const json: any = await res.json().catch(() => ({}))
    if (res.ok && json?.messages?.[0]?.id) return { ok: true, id: json.messages[0].id }
    return { ok: false, code: Number(json?.error?.code) || res.status, message: json?.error?.message ?? `HTTP ${res.status}` }
  } catch (e: any) {
    return { ok: false, code: 0, message: e?.message ?? String(e) }
  }
}

async function enfileirar(phone: string, message: string, motivo: string) {
  const { error } = await supabase.from('whatsapp_pendentes').insert({ telefone: phone, mensagem: message, motivo })
  if (error) console.error('[BRIDGE] falha ao enfileirar', phone, error.message)
}

async function enviarTemplateRetomada(phone: string): Promise<MetaResult | null> {
  const desde = new Date(Date.now() - TEMPLATE_INTERVALO_MS).toISOString()
  const { data } = await supabase.from('whatsapp_pendentes').select('id')
    .eq('telefone', phone).eq('template_enviado', true).gte('created_at', desde).limit(1)
  if (data?.length) return null   // já chamamos este lead há pouco; aguarda a resposta
  const r = await metaPost({ to: phone, type: 'template', template: { name: TEMPLATE_RETOMADA, language: { code: TEMPLATE_IDIOMA } } })
  if (r.ok) {
    await supabase.from('whatsapp_pendentes').update({ template_enviado: true })
      .eq('telefone', phone).is('entregue_em', null)
  }
  return r
}

// Botões da Meta a partir das mensagens que o N8N já envia (o N8N não muda).
// Os títulos dos botões de resposta são exatamente os textos que o nó "Detectar Opt-Out" já reconhece.
const LINK_PAGAMENTO = /https?:\/\/\S+\/pagar\/[\w-]+/
export function formatarInterativo(message: string): Record<string, unknown> | null {
  const corpo = (texto: string) => texto.replace(/\n{3,}/g, '\n\n').trim().slice(0, 1024)
  const botoes = (titulos: string[]) => ({
    buttons: titulos.map(t => ({ type: 'reply', reply: { id: t.toLowerCase(), title: t } })),
  })

  const link = message.match(LINK_PAGAMENTO)?.[0]
  if (link) {
    const texto = corpo(message.replace(link, '').replace(/👇\s*$/m, '👇'))
    return { type: 'interactive', interactive: { type: 'cta_url', body: { text: texto || 'Finalize seu pagamento com segurança 👇' }, action: { name: 'cta_url', parameters: { display_text: 'Pagar agora', url: link } } } }
  }

  if (/responde com \*?1\*? ou \*?2\*?/i.test(message)) {
    const texto = corpo(message.replace(/\*?1️⃣\*?\s*—[^\n]*\n?/, '').replace(/\*?2️⃣\*?\s*—[^\n]*\n?/, '').replace(/responde com[^\n]*/i, 'Escolha uma opção 👇'))
    return { type: 'interactive', interactive: { type: 'button', body: { text: texto }, action: botoes(['Remover da lista', 'Falar depois']) } }
  }

  if (/manda(r)? \*?voltar\*?/i.test(message)) {
    return { type: 'interactive', interactive: { type: 'button', body: { text: corpo(message) }, action: botoes(['Voltar']) } }
  }

  return null
}

// Envia como a Z-API faria. Nunca lança: devolve a resposta no formato que o N8N espera.
export async function enviarTexto(phoneRaw: string, message: string): Promise<{ zaapId: string; messageId: string; id: string; pendente?: boolean }> {
  const phone = digits(phoneRaw)
  const interativo = formatarInterativo(message)
  let r: MetaResult = interativo ? await metaPost({ to: phone, ...interativo }) : { ok: false, code: -1, message: '' }
  if (interativo && !r.ok && !JANELA_FECHADA.has(r.code)) console.error('[BRIDGE] botão recusado, enviando como texto', phone, r.code, r.message)
  if (!r.ok) r = await metaPost({ to: phone, type: 'text', text: { body: message, preview_url: true } })
  if (r.ok) return { zaapId: r.id, messageId: r.id, id: r.id }

  if (JANELA_FECHADA.has(r.code)) {
    await enfileirar(phone, message, 'janela_24h')
    const t = await enviarTemplateRetomada(phone)
    if (t && !t.ok) console.error('[BRIDGE] template de retomada falhou', phone, t.code, t.message)
    console.log(`[BRIDGE] ${phone} fora da janela de 24h — mensagem pendente${t?.ok ? ', template enviado' : ''}`)
    return { zaapId: 'pendente', messageId: 'pendente', id: 'pendente', pendente: true }
  }

  console.error('[BRIDGE] envio falhou', phone, r.code, r.message)
  return { zaapId: 'erro', messageId: 'erro', id: 'erro' }
}

// Entrega o que ficou pendente quando o lead volta a escrever (janela reaberta).
export async function entregarPendentes(phoneRaw: string): Promise<number> {
  const phone = digits(phoneRaw)
  const { data, error } = await supabase.from('whatsapp_pendentes').select('id, mensagem')
    .eq('telefone', phone).is('entregue_em', null).order('created_at', { ascending: true }).limit(50)
  if (error || !data?.length) return 0
  let entregues = 0
  for (const p of data) {
    const interativo = formatarInterativo(p.mensagem)
    let r: MetaResult = interativo ? await metaPost({ to: phone, ...interativo }) : { ok: false, code: -1, message: '' }
    if (!r.ok) r = await metaPost({ to: phone, type: 'text', text: { body: p.mensagem, preview_url: true } })
    if (!r.ok) { console.error('[BRIDGE] pendente não entregue', phone, r.code, r.message); break }
    await supabase.from('whatsapp_pendentes').update({ entregue_em: new Date().toISOString() }).eq('id', p.id)
    entregues++
    await new Promise(res => setTimeout(res, 1200))
  }
  return entregues
}

// ── Entrada ───────────────────────────────────────────────────────────────────

export function textoDaMensagem(msg: any): string {
  switch (msg?.type) {
    case 'text': return msg.text?.body ?? ''
    case 'button': return msg.button?.text ?? msg.button?.payload ?? ''
    case 'interactive': return msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? ''
    case 'image': case 'video': case 'document': return msg[msg.type]?.caption ?? ''
    default: return ''
  }
}

// Converte uma mensagem da Meta no corpo ReceivedCallback que o nó "Extrair Mensagem" do N8N lê.
export function paraZapi(msg: any, value: any): Record<string, unknown> | null {
  const phone = digits(msg?.from)
  if (!phone || !msg?.id) return null
  const nome = value?.contacts?.find((c: any) => digits(c?.wa_id) === phone)?.profile?.name ?? ''
  const base = { type: 'ReceivedCallback', fromMe: false, isEdit: false, isGroup: false, phone, messageId: msg.id, senderName: nome, momment: Number(msg.timestamp) * 1000 || Date.now() }

  if (msg.type === 'contacts') {
    const contactArray = (msg.contacts ?? []).map((c: any) => ({
      displayName: c?.name?.formatted_name ?? [c?.name?.first_name, c?.name?.last_name].filter(Boolean).join(' '),
      phones: (c?.phones ?? []).map((p: any) => digits(p?.wa_id || p?.phone)).filter(Boolean),
    }))
    return contactArray.length ? { ...base, contactArray } : null
  }

  const texto = textoDaMensagem(msg)
  if (!texto) return null   // áudio, figurinha etc.: o fluxo da Z-API também ignorava sem texto
  return { ...base, text: { message: texto } }
}

export async function encaminharParaN8n(value: any): Promise<void> {
  for (const msg of value?.messages ?? []) {
    const phone = digits(msg?.from)
    if (phone) {
      const n = await entregarPendentes(phone).catch(() => 0)
      if (n) console.log(`[BRIDGE] ${phone}: ${n} mensagem(ns) pendente(s) entregue(s)`)
    }
    const body = paraZapi(msg, value)
    if (!body) { console.log(`[BRIDGE] ${phone} tipo=${msg?.type} sem texto — ignorado`); continue }
    try {
      const res = await fetch(N8N_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) console.error('[BRIDGE] N8N respondeu', res.status)
      else console.log(`[BRIDGE] ${phone} -> N8N (${msg.type})`)
    } catch (e: any) {
      console.error('[BRIDGE] N8N indisponível', e?.message)
    }
  }
}
