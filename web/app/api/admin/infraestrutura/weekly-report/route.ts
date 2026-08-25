import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''
const FROM_EMAIL = 'Hormone Ecosystem <alertas@hormoneecosystem.com>'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'vcechella@gmail.com'

const ZAPI_INSTANCE = '3F4D4A5044DBE1E458808A5553EDB71F'
const ZAPI_TOKEN = '039297EE5982433C7EFA38C5'
const ZAPI_CLIENT_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'

async function getWeeklyStats() {
  const since = new Date()
  since.setDate(since.getDate() - 7)
  const sinceIso = since.toISOString()

  const [callsRes, leadsRes, paysRes] = await Promise.all([
    supabase.from('ana_calls').select('call_sid, status, gates_passed, created_at').gte('created_at', sinceIso),
    supabase.from('leads').select('id, created_at').gte('created_at', sinceIso),
    supabase.from('pagamentos').select('status, created_at').gte('created_at', sinceIso),
  ])

  const calls = callsRes.data ?? []
  const totalCalls = calls.length
  const ptlCalls = calls.filter(c => !String(c.call_sid).startsWith('sim-browser-')).length
  const simCalls = calls.filter(c => String(c.call_sid).startsWith('sim-browser-')).length
  const completedCalls = calls.filter(c => {
    const gp: string[] = c.gates_passed ?? []
    return gp.includes('GATE_VALIDACAO')
  }).length

  const leads = leadsRes.data ?? []
  const pays = paysRes.data ?? []
  const paidCount = pays.filter(p => p.status === 'approved').length

  return { totalCalls, ptlCalls, simCalls, completedCalls, leads: leads.length, paidCount }
}

function reportHtml(stats: Awaited<ReturnType<typeof getWeeklyStats>>, weekLabel: string) {
  const convRate = stats.ptlCalls > 0 ? ((stats.completedCalls / stats.ptlCalls) * 100).toFixed(1) : '0'

  const metric = (label: string, value: string | number, sub?: string, accent?: string) => `
    <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:14px 16px;">
      <p style="margin:0 0 2px;font-size:22px;font-weight:700;color:${accent ?? '#7c5cfc'};font-variant-numeric:tabular-nums;">${value}</p>
      <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:.05em;">${label}</p>
      ${sub ? `<p style="margin:4px 0 0;font-size:11px;color:#555;">${sub}</p>` : ''}
    </div>`

  return `<!DOCTYPE html><html><body style="background:#0a0a0b;font-family:system-ui,sans-serif;padding:32px;color:#e5e5e5;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="border-bottom:1px solid #222;padding-bottom:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#555;">Hormone Ecosystem</p>
      <h1 style="margin:4px 0 0;font-size:24px;font-weight:700;">Relatório Semanal</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#666;">${weekLabel}</p>
    </div>

    <p style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#555;margin:0 0 10px;">Ligações Ana Voz</p>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px;">
      ${metric('PTL (Reais)', stats.ptlCalls, undefined, '#10a37f')}
      ${metric('Concluídas', stats.completedCalls, 'chegaram ao GATE_VALIDACAO', '#22c55e')}
      ${metric('Conversão', `${convRate}%`, 'ptl → concluída', convRate >= '30' ? '#22c55e' : '#f59e0b')}
    </div>

    <p style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#555;margin:0 0 10px;">Leads & Pagamentos</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:24px;">
      ${metric('Novos Leads', stats.leads, 'cadastros na semana', '#7c5cfc')}
      ${metric('Pagamentos', stats.paidCount, 'aprovados MP', '#f59e0b')}
    </div>

    <div style="background:#111;border:1px solid #222;border-radius:8px;padding:16px;margin-bottom:24px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;">Simulador</p>
      <p style="margin:0;font-size:13px;color:#888;">${stats.simCalls} sessões no simulador esta semana</p>
    </div>

    <div style="text-align:center;border-top:1px solid #1a1a1a;padding-top:20px;">
      <a href="https://www.hormoneecosystem.com/admin" style="display:inline-block;background:#7c5cfc;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:600;">Abrir Painel Admin</a>
    </div>
    <p style="font-size:11px;color:#333;text-align:center;margin-top:16px;">Enviado automaticamente toda segunda-feira</p>
  </div>
</body></html>`
}

export async function GET() {
  try {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - 7)
    const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const weekLabel = `${fmt(weekStart)} — ${fmt(now)}`

    const stats = await getWeeklyStats()

    const html = reportHtml(stats, weekLabel)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `📊 Relatório Semanal Hormone Ecosystem — ${weekLabel}`,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    })

    // Also send WhatsApp summary
    const adminPhone = process.env.ADMIN_WHATSAPP ?? '5548988416899'
    const convRate = stats.ptlCalls > 0 ? ((stats.completedCalls / stats.ptlCalls) * 100).toFixed(1) : '0'
    const waSummary = `📊 *Relatório Semanal — ${weekLabel}*\n\n` +
      `📞 Ligações PTL: *${stats.ptlCalls}*\n` +
      `✅ Concluídas: *${stats.completedCalls}* (${convRate}%)\n` +
      `👤 Novos leads: *${stats.leads}*\n` +
      `💰 Pagamentos: *${stats.paidCount}*\n\n` +
      `Detalhes: https://www.hormoneecosystem.com/admin`

    await fetch(`https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_CLIENT_TOKEN },
      body: JSON.stringify({ phone: adminPhone, message: waSummary }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => {})

    const resJson = await res.json().catch(() => ({}))
    return NextResponse.json({ ok: res.ok, stats, weekLabel, resend: resJson })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
