import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return new NextResponse('url required', { status: 400 })

  // Only proxy Twilio recording URLs
  if (!url.startsWith('https://api.twilio.com/')) {
    return new NextResponse('invalid url', { status: 400 })
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) {
    return new NextResponse('twilio credentials not configured', { status: 500 })
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } })

  if (!res.ok) {
    return new NextResponse(`twilio error ${res.status}`, { status: res.status })
  }

  return new NextResponse(res.body, {
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'audio/mpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
