import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const MP_TOKEN = process.env.MP_ACCESS_TOKEN || 'APP_USR-1603783113978504-062408-d67a1021538897e0341f70bb7645fdcf-2669863266'
const ZAPI_INSTANCE = '3F4D4A5044DBE1E458808A5553EDB71F'
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'
const ZAPI_CLIENT_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: (url: RequestInfo | URL, opts: RequestInit = {}) => fetch(url, { ...opts, cache: 'no-store' }) },
    }
  )
}

async function checkMP(): Promise<{ ok: boolean; latencia: number }> {
  const t0 = Date.now()
  try {
    const resp = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: { Authorization: `Bearer ${MP_TOKEN}` },
      signal: AbortSignal.timeout(5000),
    })
    return { ok: resp.ok, latencia: Date.now() - t0 }
  } catch {
    return { ok: false, latencia: Date.now() - t0 }
  }
}

async function checkZAPI(): Promise<{ ok: boolean; latencia: number }> {
  const t0 = Date.now()
  try {
    const resp = await fetch(
      `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/status`,
      { headers: { 'Client-Token': ZAPI_CLIENT_TOKEN }, signal: AbortSignal.timeout(5000) }
    )
    return { ok: resp.ok, latencia: Date.now() - t0 }
  } catch {
    return { ok: false, latencia: Date.now() - t0 }
  }
}

export async function GET() {
  const supabase = makeClient()

  const t0 = Date.now()
  const [mpStatus, zapiStatus, pagamentosRes] = await Promise.all([
    checkMP(),
    checkZAPI(),
    supabase
      .from('pagamentos')
      .select('lead_telefone, payment_id, metodo, valor, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20),
  ])
  const supabaseLatencia = Date.now() - t0

  return NextResponse.json({
    config: {
      valor_avista: 25.00,
      valor_recorrente: 5.00,
      parcelas: 6,
      descricao_mp: 'Programa Hormonal Dr. Vinícius',
      ambiente: 'teste',
    },
    servicos: {
      supabase: { ok: !pagamentosRes.error, latencia: supabaseLatencia },
      mercadopago: mpStatus,
      zapi: zapiStatus,
    },
    log_webhooks: pagamentosRes.data || [],
  })
}
