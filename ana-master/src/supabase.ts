import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './config.js'

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws as any },
})

export interface AnaCall {
  id: string
  call_sid: string
  telefone: string
  stage: string
  status: 'active' | 'ganho' | 'perdido' | 'encerrado'
  gates_passed: string[]
  memories: Record<string, unknown>
  created_at: string
  updated_at: string
}

export async function upsertCall(callSid: string, telefone: string) {
  const norm = telefone.startsWith('55') ? telefone : `55${telefone}`
  const bare = norm.replace(/^55/, '')

  // Garante que o lead existe em leads (lido pelo CRM)
  // telefone não tem UNIQUE constraint — verificamos antes de inserir
  const { data: existingLead } = await supabase
    .from('leads')
    .select('id')
    .or(`telefone.eq.${norm},telefone.eq.${bare}`)
    .maybeSingle()
  if (!existingLead) {
    const { error: leadErr } = await supabase.from('leads').insert({
      telefone: norm, etapa: 'apresentacao', etapa_agente: 1, origem: 'ptl',
    })
    if (leadErr) console.error(`[UPSERT_CALL] erro ao inserir lead: ${leadErr.message} | code=${leadErr.code}`)
    else console.log(`[UPSERT_CALL] lead inserido telefone=${norm}`)
  } else {
    console.log(`[UPSERT_CALL] lead já existe telefone=${norm}`)
  }

  const { data } = await supabase
    .from('ana_calls')
    .upsert(
      { call_sid: callSid, telefone: norm, stage: 'apresentacao', status: 'active', gates_passed: [], memories: { telefone: norm }, em_ligacao: true },
      { onConflict: 'call_sid' }
    )
    .select()
    .single()
  return data as AnaCall | null
}

export async function endCall(callSid: string) {
  await supabase
    .from('ana_calls')
    .update({ em_ligacao: false, updated_at: new Date().toISOString() })
    .eq('call_sid', callSid)
}

export async function getCallStage(callSid: string): Promise<string | null> {
  const { data } = await supabase.from('ana_calls').select('stage').eq('call_sid', callSid).single()
  return (data as any)?.stage ?? null
}

// Updates stage directly without going through gate_transition RPC.
// Used by passive transcript-based stage detection — does not affect gate logic.
export async function updateCallStage(callSid: string, stage: string) {
  await supabase
    .from('ana_calls')
    .update({ stage, updated_at: new Date().toISOString() })
    .eq('call_sid', callSid)
}

// ── Single door for stage transitions ────────────────────────────────────────
// All gate transitions go through this RPC — stage + gate_passed + trace in one transaction.
// The SQL function (supabase/gate_transition_rpc.sql) must be deployed to Supabase first.
export async function executeGateTransition(
  callSid: string,
  gateId: string,
  fromStage: string,
  toStage: string,
  evidence: Record<string, unknown> = {},
): Promise<{ transitioned: boolean; reason: string; next_stage?: string }> {
  const { data, error } = await supabase.rpc('gate_transition', {
    p_call_sid:   callSid,
    p_gate_id:    gateId,
    p_from_stage: fromStage,
    p_to_stage:   toStage,
    p_evidence:   evidence,
  })
  if (error) {
    return { transitioned: false, reason: `RPC error: ${error.message}` }
  }
  return data as { transitioned: boolean; reason: string; next_stage?: string }
}

// setCallStatusGanho is now handled inside gate_transition RPC for GATE_VALIDACAO.
// This function remains only to update the leads table after GATE_VALIDACAO passes.
export async function updateLeadsGanho(callSid: string) {
  const { data } = await supabase.from('ana_calls').select('telefone').eq('call_sid', callSid).single()
  if (data?.telefone) {
    const t = data.telefone as string
    await supabase
      .from('leads')
      .update({ etapa: 'ganho', etapa_agente: 8, updated_at: new Date().toISOString() })
      .or(`telefone.eq.${t},telefone.eq.55${t},telefone.eq.${t.replace(/^55/, '')}`)
  }
}

export async function saveMemory(callSid: string, key: string, value: unknown) {
  await supabase.from('ana_memories').upsert(
    { call_sid: callSid, memory_key: key, value: JSON.stringify(value) },
    { onConflict: 'call_sid,memory_key' }
  )
  // Also cache in ana_calls.memories JSONB
  const { data } = await supabase.from('ana_calls').select('memories').eq('call_sid', callSid).single()
  const memories = { ...((data?.memories as Record<string, unknown>) ?? {}), [key]: value }
  await supabase.from('ana_calls').update({ memories, updated_at: new Date().toISOString() }).eq('call_sid', callSid)
}

export async function getMemories(callSid: string): Promise<Record<string, unknown>> {
  const { data } = await supabase.from('ana_calls').select('memories').eq('call_sid', callSid).single()
  return (data?.memories as Record<string, unknown>) ?? {}
}

export async function appendTranscript(callSid: string, role: 'user' | 'assistant', text: string) {
  if (!text?.trim()) return
  const { data } = await supabase.from('ana_calls').select('memories').eq('call_sid', callSid).single()
  const memories = (data?.memories as Record<string, unknown>) ?? {}
  const transcript = Array.isArray(memories.transcript) ? [...memories.transcript] : []
  transcript.push({ role, text: text.trim(), ts: Date.now() })
  await supabase.from('ana_calls').update({
    memories: { ...memories, transcript },
    updated_at: new Date().toISOString(),
  }).eq('call_sid', callSid)
}

export async function saveSpeechProgress(callSid: string, progress: Record<string, unknown>) {
  const { data } = await supabase.from('ana_calls').select('memories').eq('call_sid', callSid).single()
  const memories = { ...((data?.memories as Record<string, unknown>) ?? {}), speech_progress: progress }
  await supabase.from('ana_calls').update({ memories, updated_at: new Date().toISOString() }).eq('call_sid', callSid)
}

export async function loadSpeechProgress(callSid: string): Promise<Record<string, unknown> | null> {
  const { data } = await supabase.from('ana_calls').select('memories').eq('call_sid', callSid).single()
  const memories = (data?.memories as Record<string, unknown>) ?? {}
  return (memories.speech_progress as Record<string, unknown>) ?? null
}

export async function getLeadByPhone(telefone: string) {
  const digits = String(telefone).replace(/\D/g, '')
  const { data } = await supabase
    .from('leads')
    .select('id, nome, telefone, status_pagamento, token_indicacao, etapa_agente, referido_por')
    .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)
    .maybeSingle()
  return data
}

export async function verifyPayment(telefone: string): Promise<boolean> {
  const lead = await getLeadByPhone(telefone)
  return lead?.status_pagamento === 'pago'
}

export async function verifyPaymentByCallSid(callSid: string): Promise<boolean> {
  const { data } = await supabase
    .from('pagamentos')
    .select('status')
    .eq('call_sid', callSid)
    .eq('status', 'approved')
    .maybeSingle()
  return !!data
}

export async function checkReferidos(token: string): Promise<{ completo: boolean; semDados: number; missaoCompleta: boolean }> {
  // Resolve phone from leads via token
  const { data: lead } = await supabase
    .from('leads')
    .select('telefone')
    .eq('token_indicacao', token)
    .maybeSingle()

  if (!lead?.telefone) return { completo: false, semDados: 20, missaoCompleta: false }

  const phone = String(lead.telefone).replace(/\D/g, '')

  const { data } = await supabase
    .from('contatos_referidos')
    .select('id, profissao, hobby, status')
    .or(`indicado_por_telefone.eq.${phone},indicado_por_telefone.eq.55${phone},indicado_por_telefone.eq.${phone.replace(/^55/, '')}`)

  if (!data || data.length === 0) return { completo: false, semDados: 20, missaoCompleta: false }

  const ativos = data.filter((r: any) => r.status !== 'recusou')
  const semDados = ativos.filter((r: any) => !r.profissao || !r.hobby).length
  const completo = ativos.length >= 20
  const missaoCompleta = completo && semDados === 0

  return { completo, semDados, missaoCompleta }
}
