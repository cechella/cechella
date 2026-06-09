import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { r2, R2_BUCKET } from '@/lib/r2'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    if (!videoId) return NextResponse.json({ error: 'videoId required' }, { status: 400 })

    const cookieStore = await cookies()

    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(s) { try { s.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
        },
      }
    )

    const { data: { user } } = await authClient.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
    )

    const { data: video } = await serviceClient
      .from('videos')
      .select('id, title, hls_path, is_published')
      .eq('id', videoId)
      .single()

    if (!video) return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    if (!video.is_published) return NextResponse.json({ error: 'Video not available' }, { status: 403 })
    if (!video.hls_path) return NextResponse.json({ error: 'No video file' }, { status: 404 })

    const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: video.hls_path })
    const signedUrl = await getSignedUrl(r2, command, { expiresIn: 7200 })

    const ext = video.hls_path.split('.').pop()?.toLowerCase() ?? ''
    const isHls = ext === 'm3u8'

    return NextResponse.json({ signedUrl, title: video.title, watermark: user.email, isHls })
  } catch (err) {
    console.error('[r2-signed-url]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
