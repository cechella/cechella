import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const modNum = parseInt(request.nextUrl.searchParams.get('num') ?? '1')

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: mods } = await admin
    .from('training_modules').select('*').eq('num', modNum).order('created_at').limit(1)

  const mod = mods?.[0] ?? null
  if (!mod) return NextResponse.json({ mod: null, lessons: [] })

  const { data: allLessons } = await admin
    .from('training_lessons').select('*').order('num')

  const lessons = (allLessons ?? []).filter((l: { module_id: string }) => l.module_id === mod.id)

  return NextResponse.json({ mod, lessons })
}
