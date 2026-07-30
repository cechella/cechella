import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const modNum = parseInt(request.nextUrl.searchParams.get('num') ?? '1')

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: mod } = await admin
    .from('training_modules').select('*').eq('num', modNum).single()

  if (!mod) return NextResponse.json({ mod: null, lessons: [] })

  const { data: lessons } = await admin
    .from('training_lessons').select('*').eq('module_id', mod.id).order('num')

  return NextResponse.json({ mod, lessons: lessons ?? [] })
}
