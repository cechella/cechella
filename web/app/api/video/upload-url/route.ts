import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2, R2_BUCKET } from '@/lib/r2'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { videoId, fileName, contentType, type } = await request.json()
  if (!videoId || !fileName) {
    return NextResponse.json({ error: 'videoId and fileName required' }, { status: 400 })
  }

  const ext = fileName.split('.').pop()
  const key = type === 'thumbnail'
    ? `thumbnails/${videoId}/thumb.${ext}`
    : `hls/${videoId}/master.${ext}`

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType ?? (type === 'thumbnail' ? 'image/jpeg' : 'video/mp4'),
  })

  const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 })

  return NextResponse.json({ uploadUrl, key })
}
