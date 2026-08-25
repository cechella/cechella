import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ZAPI_INSTANCE = '3F4D4A5044DBE1E458808A5553EDB71F'
const ZAPI_TOKEN = '039297EE5982433C7EFA38C5'
const ZAPI_CLIENT_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'
const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}`

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Hormone Ecosystem <alertas@hormoneecosystem.com>'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'vcechella@gmail.com'

async function checkOpenAI(): Promise<{ ok: boolean; available: number | null; error?: string }> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { ok: false, available: null, error: 'OPENAI_API_KEY não configurada' }

  try {
    const billingRes = await fetch('https://api.openai.com/dashboard/billing/credit_grants', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    })
    if (billingRes.ok) {
      const data = await billingRes.json() as { total_available?: number }
      const available = data.total_available ?? null
      return { ok: available === null || available > 0, available }
    }
  } catch { /* fall through to probe */ }

  try {
    const probe = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: '1' }], max_tokens: 1 }),
      signal: AbortSignal.timeout(10000),
    })
    if (probe.status === 200) return { ok: true, available: null }
    const err = await probe.json() as { error?: { code?: string; type?: string } }
    if (err?.error?.code === 'insufficient_quota' || err?.error?.type === 'insufficient_quota') {
      return { ok: false, available: 0, error: 'Sem saldo — Ana Voz offline' }
    }
    return { ok: probe.ok, available: null }
  } catch (e: any) {
    return { ok: false, available: null, error: e.message }
  }
}

async function checkZAPI(): Promise<{ ok: boolean; connected: boolean; status?: string }> {
  try {
    const res = await fetch(`${ZAPI_BASE}/status`, {
      headers: { 'Client-Token': ZAPI_CLIENT_TOKEN },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { ok: false, connected: false, status: `HTTP ${res.status}` }
    const data = await res.json() as { connected?: boolean; status?: string; session?: string }
    const connected = !!(data.connected ?? data.status === 'open' ?? data.session === 'CONNECTED')
    return { ok: true, connected, status: data.status ?? (connected ? 'open' : 'closed') }
  } catch (e: any) {
    return { ok: false, connected: false, status: e.message }
  }
}

async function sendWhatsApp(phone: string, message: string) {
  await fetch(`${ZAPI_BASE}/send-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_CLIENT_TOKEN },
    body: JSON.stringify({ phone, message }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => {})
}

async function sendEmail(subject: string, html: string) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_EMAIL, to: ADMIN_EMAIL, subject, html }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => {})
}

function alertEmailHtml(issues: { title: string; detail: string; action: string; link: string }[]) {
  const rows = issues.map(i => `
    <div style="background:#1a1a1a;border:1px solid #ef4444;border-radius:8px;padding:16px;margin-bottom:12px;">
      <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#ef4444;">🔴 ${i.title}</p>
      <p style="margin:0 0 10px;font-size:13px;color:#aaa;">${i.detail}</p>
      <a href="${i.link}" style="display:inline-block;background:#ef4444;color:#fff;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:600;">${i.action}</a>
    </div>`).join('')

  return `<!DOCTYPE html><html><body style="background:#0a0a0b;font-family:system-ui,sans-serif;padding:32px;color:#e5e5e5;">
    <div style="max-width:520px;margin:0 auto;">
      <div style="border-bottom:1px solid #222;padding-bottom:16px;margin-bottom:20px;">
        <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#666;">Hormone Ecosystem</p>
        <h1 style="margin:4px 0 0;font-size:22px;font-weight:700;">⚠️ Alerta de Infraestrutura</h1>
      </div>
      ${rows}
      <p style="font-size:11px;color:#444;margin-top:24px;border-top:1px solid #1a1a1a;padding-top:12px;">
        Verificação automática — <a href="https://www.hormoneecosystem.com/admin/infraestrutura" style="color:#7c5cfc;">abrir painel</a>
      </p>
    </div>
  </body></html>`
}

export async function GET() {
  const [openai, zapi] = await Promise.all([checkOpenAI(), checkZAPI()])

  const issues: { title: string; detail: string; action: string; link: string }[] = []

  if (!openai.ok) {
    issues.push({
      title: 'OpenAI sem crédito — Ana Voz OFFLINE',
      detail: openai.error ?? 'Saldo insuficiente. Ligações PTL não estão funcionando.',
      action: 'Recarregar agora',
      link: 'https://platform.openai.com/billing',
    })
  }
  if (!zapi.connected) {
    issues.push({
      title: 'Z-API desconectado — WhatsApp OFFLINE',
      detail: `Status: ${zapi.status ?? 'desconhecido'}. PIX e mensagens não estão sendo enviados.`,
      action: 'Verificar Z-API',
      link: 'https://app.z-api.io',
    })
  }

  if (issues.length > 0) {
    const adminPhone = process.env.ADMIN_WHATSAPP ?? '5548988416899'
    const waMsg = issues.map(i => `🔴 *${i.title}*\n${i.detail}\n${i.link}`).join('\n\n')

    await Promise.all([
      sendEmail('⚠️ Alerta Infraestrutura — Hormone Ecosystem', alertEmailHtml(issues)),
      adminPhone ? sendWhatsApp(adminPhone, `⚠️ *ALERTA — Hormone Ecosystem*\n\n${waMsg}`) : Promise.resolve(),
    ])
  }

  return NextResponse.json({ openai, zapi, ts: new Date().toISOString() })
}
