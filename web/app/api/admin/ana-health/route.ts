import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ANA_MASTER_URL = process.env.ANA_MASTER_URL || 'https://ana-master.hormoneecosystem.com'

export async function GET() {
  try {
    const res = await fetch(`${ANA_MASTER_URL}/health`, { signal: AbortSignal.timeout(5000) })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 503 })
  }
}
