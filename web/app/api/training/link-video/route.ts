import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()

  // Auth check — must be admin
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll() }, setAll() {} } }
  )
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use createClient (not createServerClient) for true RLS bypass with service role
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { modNum, modTitle, modColor, lessonNum, lessonTitle, lessonDuration, videoId } = await request.json()

  // Find or create training_module (use limit(1) to handle duplicates)
  const { data: modRows } = await admin
    .from('training_modules').select('id').eq('num', modNum).order('created_at').limit(1)
  let modRow = modRows?.[0] ?? null

  if (!modRow) {
    const { data: inserted, error } = await admin
      .from('training_modules')
      .insert({ num: modNum, title: modTitle, subtitle: '', color: modColor, unlocked: true, published: true })
      .select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    modRow = inserted
  }

  // Find or create training_lesson (use limit(1) to handle duplicates)
  const { data: lessonRows } = await admin
    .from('training_lessons').select('id').eq('module_id', modRow!.id).eq('num', lessonNum).limit(1)
  let lessonRow = lessonRows?.[0] ?? null

  if (!lessonRow) {
    const { data: inserted, error } = await admin
      .from('training_lessons')
      .insert({ module_id: modRow!.id, num: lessonNum, title: lessonTitle, duration: lessonDuration, video_url: videoId, is_free: false })
      .select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    lessonRow = inserted
  } else {
    await admin.from('training_lessons').update({ video_url: videoId }).eq('id', lessonRow.id)
  }

  return NextResponse.json({ ok: true, lessonId: lessonRow?.id })
}
