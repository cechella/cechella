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
  const { data } = await supabase
    .from('ana_calls')
    .upsert({ call_sid: callSid, telefone: norm, stage: 'apresentacao', status: 'active', gates_passed: [], memories: {} }, { onConflict: 'call_sid' })
    .select()
    .single()
  return data as AnaCall | null
}

export async function updateCallStage(callSid: string, stage: string) {
  await supabase
    .from('ana_calls')
    .update({ stage, updated_at: new Date().toISOString() })
    .eq('call_sid', callSid)
}

export async function recordGatePassed(callSid: string, gateId: string) {
  const { data } = await supabase.from('ana_calls').select('gates_passed').eq('call_sid', callSid).single()
  const gates = [...((data?.gates_passed as string[]) ?? []), gateId]
  await supabase.from('ana_calls').update({ gates_passed: gates, updated_at: new Date().toISOString() }).eq('call_sid', callSid)
}

export async function setCallStatusGanho(callSid: string) {
  await supabase
    .from('ana_calls')
    .update({ status: 'ganho', stage: 'ganho', updated_at: new Date().toISOString() })
    .eq('call_sid', callSid)

  // Also update leads table to match
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

export async function checkReferidos(token: string): Promise<{ completo: boolean; semDados: number; missaoCompleta: boolean }> {
  const { data } = await supabase
    .from('indicacoes')
    .select('id, profissao, hobby, recusou')
    .eq('token_origem', token)

  if (!data || data.length === 0) return { completo: false, semDados: 20, missaoCompleta: false }

  const ativos = data.filter((r: any) => !r.recusou)
  const semDados = ativos.filter((r: any) => !r.profissao || !r.hobby).length
  const completo = ativos.length >= 20
  const missaoCompleta = completo && semDados === 0

  return { completo, semDados, missaoCompleta }
}
