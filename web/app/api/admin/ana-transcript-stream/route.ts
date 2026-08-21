import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ANA_MASTER_URL = process.env.ANA_MASTER_URL || 'https://ana-master.hormoneecosystem.com'

export async function GET(req: NextRequest) {
  const callSid = req.nextUrl.searchParams.get('callSid')
  if (!callSid) {
    return new Response('callSid required', { status: 400 })
  }

  const upstream = await fetch(`${ANA_MASTER_URL}/transcript-stream/${callSid}`, {
    headers: { Accept: 'text/event-stream' },
    // @ts-ignore — Node fetch supports signal
    signal: req.signal,
  })

  if (!upstream.ok || !upstream.body) {
    return new Response('upstream error', { status: 502 })
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
