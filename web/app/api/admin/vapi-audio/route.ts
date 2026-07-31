import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VAPI_API_KEY = 'e3bc519a-7466-4450-bcfc-2ae9566d9e2f'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url obrigatória' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${VAPI_API_KEY}` },
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
