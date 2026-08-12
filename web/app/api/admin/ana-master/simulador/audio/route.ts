import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const callSid = req.nextUrl.searchParams.get('callSid')
    if (!callSid) return NextResponse.json({ error: 'callSid obrigatório' }, { status: 400 })

    const blob = await req.blob()
    if (blob.size < 1000) return NextResponse.json({ error: 'áudio muito curto' }, { status: 400 })

    const filename = `${callSid}.webm`

    const { error: uploadError } = await supabase.storage
      .from('simulator-audio')
      .upload(filename, blob, { contentType: 'audio/webm', upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message, skipped: true })
    }

    const { data: urlData } = supabase.storage
      .from('simulator-audio')
      .getPublicUrl(filename)

    const { data: call } = await supabase.from('ana_calls').select('memories').eq('call_sid', callSid).single()
    const memories = { ...((call?.memories as Record<string, unknown>) ?? {}), audio_url: urlData.publicUrl }
    await supabase.from('ana_calls').update({ memories, updated_at: new Date().toISOString() }).eq('call_sid', callSid)

    return NextResponse.json({ ok: true, audioUrl: urlData.publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
