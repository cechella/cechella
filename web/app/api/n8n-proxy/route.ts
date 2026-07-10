import { NextRequest, NextResponse } from 'next/server'

const N8N_URL = 'https://n8n.hormoneecosystem.com/webhook/hormone-agent'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const response = await fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
