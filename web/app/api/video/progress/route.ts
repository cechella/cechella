import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()

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

  const body = await request.json()
  const { videoId, progressSeconds, completed } = body

  if (!videoId || progressSeconds === undefined) {
    return NextResponse.json({ error: 'videoId and progressSeconds are required' }, { status: 400 })
  }

  const { error } = await authClient
    .from('watch_history')
    .upsert(
      {
        patient_id: user.id,
        video_id: videoId,
        progress_seconds: progressSeconds,
        completed: completed ?? false,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: 'patient_id,video_id' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
