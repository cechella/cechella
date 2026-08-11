import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ANA_MASTER_URL = process.env.ANA_MASTER_URL || 'https://ana-master.hormoneecosystem.com'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { numero, referidor, contexto } = body

  if (!numero) return NextResponse.json({ error: 'numero obrigatório' }, { status: 400 })

  try {
    const res = await fetch(`${ANA_MASTER_URL}/outbound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ numero, referidor: referidor || '', contexto: contexto || '' }).toString(),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
