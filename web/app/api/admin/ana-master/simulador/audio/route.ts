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
    const partial = req.nextUrl.searchParams.get('partial') === 'true'
    if (!callSid) return NextResponse.json({ error: 'callSid obrigatório' }, { status: 400 })

    const blob = await req.blob()
    if (blob.size < 500) return NextResponse.json({ ok: true, skipped: true })

    if (partial) {
      // Salva chunk parcial com timestamp único
      const partName = `${callSid}-part-${Date.now()}.webm`
      await supabase.storage
        .from('simulator-audio')
        .upload(partName, blob, { contentType: 'audio/webm', upsert: false })
      return NextResponse.json({ ok: true, partial: true })
    }

    // Upload final — concatena todos os chunks parciais + chunk final
    const { data: files } = await supabase.storage
      .from('simulator-audio')
      .list('', { search: `${callSid}-part-` })

    const parts: ArrayBuffer[] = []

    if (files && files.length > 0) {
      // Ordena por nome (timestamp no nome garante ordem cronológica)
      const sorted = files.sort((a, b) => a.name.localeCompare(b.name))
      for (const f of sorted) {
        const { data } = await supabase.storage.from('simulator-audio').download(f.name)
        if (data) parts.push(await data.arrayBuffer())
      }
    }

    // Adiciona o chunk final (restante após último intervalo)
    parts.push(await blob.arrayBuffer())

    // Concatena tudo
    const totalSize = parts.reduce((acc, b) => acc + b.byteLength, 0)
    const merged = new Uint8Array(totalSize)
    let offset = 0
    for (const part of parts) {
      merged.set(new Uint8Array(part), offset)
      offset += part.byteLength
    }
    const finalBlob = new Blob([merged], { type: 'audio/webm' })

    const filename = `${callSid}.webm`
    const { error: uploadError } = await supabase.storage
      .from('simulator-audio')
      .upload(filename, finalBlob, { contentType: 'audio/webm', upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message, skipped: true })
    }

    // Remove chunks parciais
    if (files && files.length > 0) {
      await supabase.storage.from('simulator-audio').remove(files.map(f => f.name))
    }

    const { data: urlData } = supabase.storage.from('simulator-audio').getPublicUrl(filename)

    const { data: call } = await supabase.from('ana_calls').select('memories').eq('call_sid', callSid).single()
    const memories = { ...((call?.memories as Record<string, unknown>) ?? {}), audio_url: urlData.publicUrl }
    await supabase.from('ana_calls').update({ memories, updated_at: new Date().toISOString() }).eq('call_sid', callSid)

    return NextResponse.json({ ok: true, audioUrl: urlData.publicUrl })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
