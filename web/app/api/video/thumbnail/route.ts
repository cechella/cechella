import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2, R2_BUCKET } from '@/lib/r2'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')
    if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

    const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })
    const url = await getSignedUrl(r2, command, { expiresIn: 3600 })
    return NextResponse.redirect(url)
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
