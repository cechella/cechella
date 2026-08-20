import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Maps Gold stage name → leads.etapa_agente integer (1-8)
const STAGE_TO_ETAPA: Record<string, number> = {
  abertura: 1,
  conexao: 2,
  combinado: 3,
  speech: 4,
  fechamento: 5,
  pagamento: 6,
  referidos: 7,
  encerramento: 8,
}

export async function PATCH(req: NextRequest) {
  try {
    const { callSid, stage } = await req.json()
    if (!callSid || !stage) {
      return NextResponse.json({ error: 'callSid e stage obrigatórios' }, { status: 400 })
    }

    await supabase
      .from('ana_calls')
      .update({ stage, updated_at: new Date().toISOString() })
      .eq('call_sid', callSid)

    // Also update leads.etapa_agente so the commercial pipeline dashboard advances
    const etapaNum = STAGE_TO_ETAPA[stage]
    if (etapaNum) {
      const { data: callRow } = await supabase
        .from('ana_calls')
        .select('telefone')
        .eq('call_sid', callSid)
        .maybeSingle()

      const tel = String(callRow?.telefone || '').replace(/\D/g, '')
      if (tel) {
        await supabase
          .from('leads')
          .update({ etapa_agente: etapaNum, updated_at: new Date().toISOString() })
          .or(`telefone.eq.${tel},telefone.eq.55${tel},telefone.eq.${tel.replace(/^55/, '')}`)
          .lt('etapa_agente', etapaNum) // only advance, never go back
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
