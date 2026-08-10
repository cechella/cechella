import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VAPI_KEY = process.env.VAPI_API_KEY!

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const callId = searchParams.get('callId')
  const assistantId = searchParams.get('assistantId')
  const last = searchParams.get('last')

  try {
    if (callId) {
      const res = await fetch(`https://api.vapi.ai/call/${callId}`, {
        headers: { Authorization: `Bearer ${VAPI_KEY}` },
      })
      const data = await res.json()
      return NextResponse.json(data)
    }

    if (last && assistantId) {
      const res = await fetch(
        `https://api.vapi.ai/call?assistantId=${assistantId}&limit=1&sortOrder=DESC`,
        { headers: { Authorization: `Bearer ${VAPI_KEY}` } }
      )
      const data = await res.json()
      const calls = Array.isArray(data) ? data : data.results || []
      if (calls.length === 0) return NextResponse.json({ error: 'Nenhuma ligação encontrada' })
      return NextResponse.json(calls[0])
    }

    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
