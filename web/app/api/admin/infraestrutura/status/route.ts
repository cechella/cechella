import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ZAPI_INSTANCE = '3F4D4A5044DBE1E458808A5553EDB71F'
const ZAPI_TOKEN = '039297EE5982433C7EFA38C5'
const ZAPI_CLIENT_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'
const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}`

async function checkOpenAI(): Promise<{ ok: boolean; available: number | null; error?: string }> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { ok: false, available: null, error: 'OPENAI_API_KEY não configurada' }

  try {
    // Try undocumented but working billing endpoint first
    const billingRes = await fetch('https://api.openai.com/dashboard/billing/credit_grants', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    })
    if (billingRes.ok) {
      const data = await billingRes.json() as { total_available?: number; grants?: { used_amount?: number; effective_at?: number; expires_at?: number }[] }
      const available = data.total_available ?? null
      return { ok: available === null || available > 0, available }
    }
  } catch { /* fall through to probe */ }

  // Fallback: minimal probe call (gpt-4o-mini, 1 token ≈ $0.00015)
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
    const connected = data.connected ?? data.status === 'open' ?? data.session === 'CONNECTED'
    return { ok: true, connected, status: data.status ?? (connected ? 'open' : 'closed') }
  } catch (e: any) {
    return { ok: false, connected: false, status: e.message }
  }
}

async function sendAlert(phone: string, message: string) {
  await fetch(`${ZAPI_BASE}/send-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_CLIENT_TOKEN },
    body: JSON.stringify({ phone, message }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => {})
}

export async function GET() {
  const [openai, zapi] = await Promise.all([checkOpenAI(), checkZAPI()])

  const adminPhone = process.env.ADMIN_WHATSAPP
  if (!openai.ok && adminPhone) {
    await sendAlert(
      adminPhone,
      `⚠️ *ALERTA — Hormone Ecosystem*\n\n🔴 OpenAI sem crédito!\nA *Ana Voz está OFFLINE* — ligações PTL não funcionam.\n\nRecargue agora: https://platform.openai.com/billing`,
    )
  }

  return NextResponse.json({ openai, zapi, ts: new Date().toISOString() })
}
