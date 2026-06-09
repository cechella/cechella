import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get('videoId')

  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 })
  }

  const cookieStore = await cookies()

  // Auth client (anon key) - check user session
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )

  const { data: { user }, error: authError } = await authClient.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Service role client - bypass RLS for storage signed URL
  const serviceClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  // Fetch video metadata
  const { data: video, error: videoError } = await serviceClient
    .from('videos')
    .select('id, title, hls_path, is_published')
    .eq('id', videoId)
    .single()

  if (videoError || !video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 })
  }

  if (!video.is_published) {
    return NextResponse.json({ error: 'Video not available' }, { status: 403 })
  }

  if (!video.hls_path) {
    return NextResponse.json({ error: 'Video has no HLS path configured' }, { status: 404 })
  }

  // Create signed URL (2 hours)
  const { data: signedData, error: signedError } = await serviceClient.storage
    .from('videos')
    .createSignedUrl(video.hls_path, 7200)

  if (signedError || !signedData) {
    return NextResponse.json({ error: 'Failed to create signed URL' }, { status: 500 })
  }

  return NextResponse.json({
    signedUrl: signedData.signedUrl,
    title: video.title,
    watermark: user.email,
  })
}
