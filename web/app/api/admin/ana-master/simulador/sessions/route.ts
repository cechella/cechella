import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const STAGE_LABELS: Record<string, string> = {
  apresentacao: 'Abertura', conexao: 'Conexão', combinado: 'Combinado',
  speech: 'Speech', fechamento: 'Fechamento', pagamento: 'Pagamento',
  referidos: 'Referidos', validacao: 'Validação', ganho: 'Ganho',
}

export async function GET(req: NextRequest) {
  // Create client per-request to prevent stale connection reuse in warm Vercel instances
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const callSid = req.nextUrl.searchParams.get('callSid')

  if (callSid) {
    const { data } = await supabase
      .from('ana_calls')
      .select('call_sid, memories, stage, created_at, updated_at')
      .eq('call_sid', callSid)
      .single()
    return NextResponse.json({ session: data ?? null })
  }

  const { data, error } = await supabase
    .from('ana_calls')
    .select('call_sid, created_at, updated_at, stage, memories, telefone')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Show simulator sessions (sim-browser-*, sim-gold-*) and real Twilio calls (CA*)
  const filtered = (data ?? [])
  const totalRaw = filtered.length
  const firstCallSids = filtered.slice(0, 5).map((r: any) => r.call_sid)

  const sessions = filtered.map((row: any) => {
    const mem = (row.memories ?? {}) as Record<string, any>
    const checkpoints = (mem.checkpoints ?? {}) as Record<string, any>
    const transcript = (mem.transcript ?? []) as any[]
    const gateLog = Object.entries(checkpoints).map(([gate, cp]: [string, any]) => ({
      gate,
      stage: cp.stage,
      ts: cp.ts,
    })).sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())

    return {
      callSid: row.call_sid,
      telefone: row.telefone ?? mem.telefone ?? null,
      stage: row.stage ?? 'apresentacao',
      stageLabel: STAGE_LABELS[row.stage ?? 'apresentacao'] ?? row.stage,
      gates: gateLog,
      transcriptCount: transcript.length,
      hasAudio: !!mem.audio_url,
      audioUrl: mem.audio_url ?? null,
      checkpoints,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })

  const res = NextResponse.json({ sessions, _debug: { totalRaw, firstCallSids } })
  res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.headers.set('Pragma', 'no-cache')
  return res
}
