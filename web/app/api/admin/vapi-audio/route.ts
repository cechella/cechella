import { NextRequest, NextResponse } from 'next/server'
import { VAPI_CONFIG } from '@/lib/vapi-config'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url obrigatória' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${VAPI_CONFIG.apiKey}` },
    })
    if (!res.ok) return NextResponse.json({ error: 'Erro ao buscar áudio' }, { status: res.status })

    const contentType = res.headers.get('content-type') || 'audio/wav'
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'no-store',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
