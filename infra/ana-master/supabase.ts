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
const etapaAgente: Record<string, number> = {
  apresentacao: 1, conexao: 2, di: 3, speech: 4,
  fechamento: 5, referidos: 6, validacao: 7, ganho: 8,
}

export async function updateLeadEtapa(telefone: string, etapa: string) {
  const t = String(telefone).replace(/\D/g, '')
  const bare = t.replace(/^55/, '')
  const num = etapaAgente[etapa] ?? 1
  await supabase
    .from('leads')
    .update({ etapa, etapa_agente: num, updated_at: new Date().toISOString() })
    .or(`telefone.eq.${t},telefone.eq.55${bare},telefone.eq.${bare}`)
}

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

export async function checkReferidos(token: string): Promise<{ total: number; completo: boolean; semDados: number; semMensagem: number; missaoCompleta: boolean }> {
  // Resolve phone from leads via token
  const { data: lead } = await supabase
    .from('leads')
    .select('telefone')
    .eq('token_indicacao', token)
    .maybeSingle()

  if (!lead?.telefone) return { total: 0, completo: false, semDados: 0, semMensagem: 0, missaoCompleta: false }

  const phone = String(lead.telefone).replace(/\D/g, '')
  // Build all plausible formats: exact, with 55 prefix, without 55 prefix, and without double 55
  const bare = phone.replace(/^55/, '')
  const with55 = `55${bare}`
  const variants = [...new Set([phone, with55, bare])]
  const orClause = variants.map(v => `indicado_por_telefone.eq.${v}`).join(',')

  const { data } = await supabase
    .from('contatos_referidos')
    .select('id, profissao, hobby, status, mensagem_enviada')
    .or(orClause)

  if (!data || data.length === 0) return { total: 0, completo: false, semDados: 20, semMensagem: 0, missaoCompleta: false }

  const ativos = data.filter((r: any) => r.status !== 'recusou')
  const semDados = ativos.filter((r: any) => !r.profissao || !r.hobby).length
  const semMensagem = ativos.filter((r: any) => !r.mensagem_enviada && r.status !== 'mensagem_enviada').length
  const completo = ativos.length >= 20
  const missaoCompleta = completo && semDados === 0 && semMensagem === 0

  return { total: ativos.length, completo, semDados, semMensagem, missaoCompleta }
}

export interface VoiceConfig {
  voice: string
  model: string
  vad_mode: string
  vad_threshold: number
  prefix_padding_ms: number
  silence_duration_ms: number
  noise_reduction: string
  reasoning_effort: string
  user_transcript_model: string
  voice_stack: string
}

export async function getVoiceConfig(): Promise<VoiceConfig | null> {
  try {
    const { data } = await supabase
      .from('ana_voice_config')
      .select('*')
      .eq('profile', 'gold')
      .single()
    return data as VoiceConfig | null
  } catch {
    return null
  }
}

export type PrevCallState = 'fresh' | 'resume' | 'completed'

export interface SessionContext {
  prevState: PrevCallState
  contextBlock: string
  metodoEscolhido?: 'pix' | 'cartao'
  nomeLead?: string
  tokenIndicacao?: string
  pagamentoConfirmado?: boolean
  referidosInfo?: { total: number; semDados: number; semMensagem: number; missaoCompleta: boolean }
}

export async function buildSessionContext(telefone: string, callSid: string): Promise<SessionContext> {
  try {
    const norm = telefone.startsWith('55') ? telefone : `55${telefone}`
    const bare = norm.replace(/^55/, '')
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch all recent calls for this number — payment/token may be on an older call
    const { data: prevCalls } = await supabase
      .from('ana_calls')
      .select('call_sid, status, stage, memories, created_at')
      .or(`telefone.eq.${norm},telefone.eq.${bare}`)
      .neq('call_sid', callSid)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(20)

    if (!prevCalls || prevCalls.length === 0) return { prevState: 'fresh', contextBlock: '' }

    const prevCall = prevCalls[0] // most recent for status/memories baseline
    const allCallSids = prevCalls.map((c: any) => c.call_sid)

    const memories: Record<string, any> = prevCall.memories ?? {}
    const isGanho = prevCalls.some((c: any) => c.status === 'ganho')

    // Look for approved payment across ALL recent calls
    const { data: pagamento } = await supabase
      .from('pagamentos')
      .select('status, metodo, call_sid')
      .in('call_sid', allCallSids)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const pagamentoConfirmado = !!pagamento

    // Merge memories across all calls — most recent wins, but pick up token/nome from any call
    const mergedMemories: Record<string, any> = {}
    for (const c of [...prevCalls].reverse()) {
      Object.assign(mergedMemories, c.memories ?? {})
    }

    const metodoEscolhido = (mergedMemories.forma_pagamento_escolhida ?? pagamento?.metodo) as 'pix' | 'cartao' | undefined
    const nomeLead = mergedMemories.nome_lead as string | undefined
    const tokenIndicacao = mergedMemories.token_indicacao as string | undefined

    if (isGanho) {
      const contextBlock = `

--- HISTÓRICO DA LEAD ---
Esta lead já completou o processo anteriormente (pagamento confirmado + 20 referidos coletados).
Status: GANHO. Seja calorosa e trate como cliente confirmada.
${nomeLead ? `Nome: ${nomeLead}` : ''}
${metodoEscolhido ? `Forma de pagamento anterior: ${metodoEscolhido}` : ''}
--- FIM HISTÓRICO ---`
      return { prevState: 'completed', contextBlock, metodoEscolhido, nomeLead, tokenIndicacao, pagamentoConfirmado }
    }

    // Check referidos state if token exists — gives Ana exact knowledge of where the lead stopped
    let referidosInfo: { total: number; semDados: number; semMensagem: number; missaoCompleta: boolean } | null = null
    if (tokenIndicacao) {
      try {
        referidosInfo = await checkReferidos(tokenIndicacao)
      } catch { /* ignore */ }
    }

    // Merge transcripts from ALL calls (concatenate, not overwrite — Object.assign loses older turns)
    const allTranscripts: Array<{ role: string; text: string; ts?: any }> = []
    for (const c of [...prevCalls].reverse()) {
      const tr = (c.memories as any)?.transcript
      if (Array.isArray(tr)) allTranscripts.push(...tr)
    }
    const transcript: Array<{ role: string; text: string }> = allTranscripts.length ? allTranscripts : (mergedMemories.transcript ?? [])
    const leadLines = transcript
      .filter((t: any) => t.role === 'user' || t.role === 'lead')
      .map((t: any) => t.text || '')
    const anaLines = transcript
      .filter((t: any) => t.role === 'assistant' || t.role === 'ana')
      .map((t: any) => t.text || '')
    const leadText = leadLines.join(' ')
    const transcriptText = transcript.map((t: any) =>
      `${(t.role === 'assistant' || t.role === 'ana') ? 'ANA' : 'LEAD'}: ${t.text}`
    ).join('\n')

    // Extract nome from lead speech (fallback to memories.nome_lead)
    const nomeFromTranscript = (() => {
      for (const line of leadLines) {
        const m = line.match(/(?:meu nome [eéEÉ]\s+|me chamo\s+|sou a\s+)([A-ZÀ-Úa-zà-ú]{2,}(?:\s+[A-ZÀ-Úa-zà-ú]{2,})?)/i)
        if (m) return m[1].trim()
      }
      // Also check if Ana repeated the name back ("Ah, Maria!" or "Maria, que bom")
      const skip = new Set(['Oi', 'Olá', 'Tudo', 'Que', 'Sim', 'Não', 'Ok', 'Certo', 'Claro', 'Nossa', 'Ah', 'Pois', 'Ótimo', 'Perfeito'])
      for (const line of anaLines) {
        const m = line.match(/^(?:Ah[,!]?\s+|Oi[,!]?\s+|Olá[,!]?\s+)?([A-ZÀ-Ú][a-zà-ú]{2,})(?:[,!]|\s+que\s+(?:bom|legal|prazer))/i)
        if (m && !skip.has(m[1])) return m[1].trim()
      }
      return null
    })()
    const nomeResolvido = (mergedMemories.nome_lead as string | undefined) || nomeFromTranscript || null

    // Extract profissão — search lead lines for profession keywords directly
    const profissaoExtraida = (() => {
      const profKeywords = /\b(contadora?|enfermeira|médica|professora|advogada|administradora|nutricionista|fisioterapeuta|psicóloga|dentista|arquiteta|engenheira|vendedora|gerente|diretora|empresária|autônoma|aposentada|contabilidade|contábil|pedagoga|farmacêutica|veterinária|esteticista|cabeleireira|recepcionista|secretária|assistente)\b/i
      // First: look for "sou [profissão]" or "trabalho como [profissão]"
      for (const line of leadLines) {
        const m = line.match(/(?:sou\s+|trabalho como\s+|trabalho de\s+)([a-záéíóúàâêôûãõç\s]{2,40})/i)
        if (m && profKeywords.test(m[1])) return m[1].replace(/,.*/, '').trim()
        // Or line itself starts with / contains the keyword
        const k = line.match(profKeywords)
        if (k) return k[1].trim()
      }
      return null
    })()
    // Extract symptoms/dores from lead speech
    const sintomasExtraidos = (() => {
      const sintomasKeywords = /\b(falta de energia|baixa de libido|libido baixa|irritabilidade|insônia|cansaço|fadiga|ganho de peso|perda de peso|queda de cabelo|fogacho|calor|ansiedade|depressão|falta de foco|falta de concentração|dor|humor|bem.estar|disposição|memória)\b/gi
      const found = new Set<string>()
      for (const line of leadLines) {
        const matches = line.match(sintomasKeywords)
        if (matches) matches.forEach((m: string) => found.add(m.toLowerCase()))
      }
      return found.size > 0 ? Array.from(found).join(', ') : null
    })()

    // Search quem indicou in lead lines only (no LEAD:/ANA: prefix confusion)
    const quemIndicouExtraido = (() => {
      for (const line of leadLines) {
        // "foi a Adriana", "foi o João", "Adriana. Uma mensagem" after previous line ended with "foi a"
        const m = line.match(/(?:foi\s+(?:a|o)\s+|me indicou\s+|indicação de\s+)([A-ZÁÉÍÓÚÂÊÎÔÛÀÃÕÇ][a-záéíóúâêîôûàãõç]{2,})/i)
        if (m) return m[1].trim()
        // Line starts directly with a name (e.g. "Adriana. Uma mensagem...")
        const mStart = line.match(/^([A-ZÁÉÍÓÚÂÊÎÔÛÀÃÕÇ][a-záéíóúâêîôûàãõç]{2,})\.\s+(?:Uma|um|Ela|ele|Foi|Fez)/i)
        if (mStart) return mStart[1].trim()
      }
      // Also check "Não, foi Adriana" pattern
      for (const line of leadLines) {
        const m = line.match(/foi\s+([A-ZÁÉÍÓÚÂÊÎÔÛÀÃÕÇ][a-záéíóúâêîôûàãõç]{2,})/i)
        if (m && !['a','o','um','uma'].includes(m[1].toLowerCase())) return m[1].trim()
      }
      return null
    })()

    // Get stage from most recent call
    const stagePrevCall = (prevCall as any).stage as string | undefined
    const stageMap: Record<string, number> = { apresentacao: 1, conexao: 2, di: 3, combinado: 3, speech: 4, fechamento: 5, referidos: 6, validacao: 7, ganho: 8 }
    const etapaNum = stageMap[stagePrevCall ?? ''] ?? 1

    // Detect if combinado was already accepted in ANY previous call
    const combinadoJaAceito = prevCalls.some(c => {
      const s = (c as any).stage as string | undefined
      return s && ['combinado', 'speech', 'fechamento', 'referidos', 'validacao', 'ganho'].includes(s)
    })
    // Detect highest stage reached across ALL previous calls
    const highestStageNum = prevCalls.reduce((max, c) => {
      const s = (c as any).stage as string | undefined
      return Math.max(max, stageMap[s ?? ''] ?? 1)
    }, 1)

    const etapas: string[] = []
    if (stagePrevCall && stagePrevCall !== 'apresentacao') etapas.push(`- Etapa em que a ligação caiu: ${stagePrevCall} (${etapaNum})`)
    if (pagamentoConfirmado) etapas.push(`- Pagamento já confirmado via ${metodoEscolhido ?? 'método anterior'}`)
    else if (metodoEscolhido) etapas.push(`- Lead escolheu ${metodoEscolhido} mas pagamento não foi confirmado`)
    if (tokenIndicacao) etapas.push('- Link de indicações já foi enviado no WhatsApp')
    if (nomeResolvido) etapas.push(`- Nome da lead: ${nomeResolvido}`)
    if (profissaoExtraida) etapas.push(`- Profissão mencionada: ${profissaoExtraida}`)
    if (quemIndicouExtraido) etapas.push(`- Quem indicou: ${quemIndicouExtraido}`)
    if (sintomasExtraidos) etapas.push(`- Sintomas relatados: ${sintomasExtraidos}`)
    if (referidosInfo && referidosInfo.total > 0) {
      etapas.push(`- Referidos já enviados: ${referidosInfo.total}`)
      if (referidosInfo.semDados > 0) etapas.push(`- Faltam dados (profissão/hobby) em ${referidosInfo.semDados} contato(s)`)
      if (referidosInfo.semMensagem > 0) etapas.push(`- ${referidosInfo.semMensagem} contato(s) ainda não receberam mensagem`)
      if (referidosInfo.missaoCompleta) etapas.push('- Missão completa: 20 referidos com dados e mensagens enviadas')
    }

    let proximoPasso: string
    if (!pagamentoConfirmado && metodoEscolhido) {
      proximoPasso = 'Retome o pagamento — pergunte se chegou o PIX/link no WhatsApp.'
    } else if (pagamentoConfirmado && !tokenIndicacao) {
      proximoPasso = 'Pagamento confirmado. Peça o favor das indicações (WAIT_FOR_YES) e aguarde o sistema enviar o link.'
    } else if (pagamentoConfirmado && tokenIndicacao && referidosInfo && referidosInfo.total > 0) {
      if (referidosInfo.missaoCompleta) {
        proximoPasso = 'Missão completa! Parabenize a lead e encerre com a mensagem de boas-vindas.'
      } else if (referidosInfo.semDados > 0 && referidosInfo.semMensagem > 0) {
        proximoPasso = `Lead já enviou ${referidosInfo.total} contatos. Diga que você viu e que faltam profissão/hobby em ${referidosInfo.semDados} e mensagens em ${referidosInfo.semMensagem}. Peça para completar no link.`
      } else if (referidosInfo.semDados > 0) {
        proximoPasso = `Lead já enviou ${referidosInfo.total} contatos. Diga que viu e que faltam profissão/hobby em ${referidosInfo.semDados}. Peça para completar no link.`
      } else if (referidosInfo.semMensagem > 0) {
        proximoPasso = `Lead já enviou ${referidosInfo.total} contatos com dados completos. Faltam mensagens para ${referidosInfo.semMensagem}. Peça para abrir o link e tocar em "Enviar mensagem".`
      } else if (referidosInfo.total < 20) {
        proximoPasso = `Lead já enviou ${referidosInfo.total} contatos. Faltam ${20 - referidosInfo.total} para completar a meta de 20.`
      } else {
        proximoPasso = 'Pagamento confirmado e link enviado. Verifique o progresso com verificar_referidos.'
      }
    } else if (pagamentoConfirmado && tokenIndicacao) {
      proximoPasso = 'Pagamento confirmado e link enviado. Pergunte se a lead chegou a abrir o link e enviar contatos. Se sim, oriente o passo a passo.'
    } else if (etapaNum === 2) {
      const fatos: string[] = []
      if (nomeResolvido) fatos.push(`nome=${nomeResolvido}`)
      if (profissaoExtraida) fatos.push(`profissão=${profissaoExtraida}`)
      if (quemIndicouExtraido) fatos.push(`indicada por=${quemIndicouExtraido}`)
      if (sintomasExtraidos) fatos.push(`sintomas=${sintomasExtraidos}`)
      proximoPasso = `Ligação caiu durante a Etapa 2 (conexão). ${fatos.length ? `Você já sabe: ${fatos.join(', ')}. ` : ''}NÃO pergunte o que já sabe. Demonstre que lembra: use o nome, mencione a profissão/rotina que ela já contou. Continue a conexão aprofundando a dor/sintomas para avançar ao DI.`
    } else if (etapaNum === 3) {
      const fatos: string[] = []
      if (nomeResolvido) fatos.push(`nome=${nomeResolvido}`)
      if (profissaoExtraida) fatos.push(`profissão=${profissaoExtraida}`)
      if (quemIndicouExtraido) fatos.push(`indicada por=${quemIndicouExtraido}`)
      if (sintomasExtraidos) fatos.push(`sintomas=${sintomasExtraidos}`)
      if (combinadoJaAceito) {
        proximoPasso = `Ligação caiu durante/após a Etapa 3. ${fatos.length ? `Você já sabe: ${fatos.join(', ')}. ` : ''}⚠️ ATENÇÃO: O combinado JÁ FOI ACEITO pela lead em ligação anterior. NÃO pergunte "Vamos fazer um combinado?" de novo. Isso já foi feito. Veja as últimas falas abaixo e continue para o PRÓXIMO PASSO após o combinado (speech do pellet ou fechamento), sem repetir nada que já foi dito.`
      } else {
        proximoPasso = `Ligação caiu durante a Etapa 3 (DI — combinado). ${fatos.length ? `Você já sabe: ${fatos.join(', ')}. ` : ''}NÃO recomece o combinado do zero. Veja as últimas falas abaixo e continue EXATAMENTE de onde parou.`
      }
    } else if (etapaNum === 4) {
      const fatos: string[] = []
      if (nomeResolvido) fatos.push(`nome=${nomeResolvido}`)
      if (profissaoExtraida) fatos.push(`profissão=${profissaoExtraida}`)
      proximoPasso = `Ligação caiu durante a Etapa 4 (speech do pellet). ${fatos.length ? `Você já sabe: ${fatos.join(', ')}. ` : ''}Veja as últimas falas abaixo e retome o speech exatamente de onde parou, sem repetir o que já foi dito.`
    } else if (etapaNum === 5) {
      proximoPasso = `Ligação caiu durante a Etapa 5 (fechamento — pagamento). ${nomeResolvido ? `Nome: ${nomeResolvido}. ` : ''}Veja as últimas falas abaixo e retome exatamente de onde parou — não repita o pitch do método de pagamento se já foi apresentado.`
    } else if (etapaNum === 6) {
      proximoPasso = `Ligação caiu durante a Etapa 6 (referidos). ${nomeResolvido ? `Nome: ${nomeResolvido}. ` : ''}Veja as últimas falas abaixo e continue o processo de referidos de onde parou, sem repetir a explicação da missão se já foi feita.`
    } else if (etapaNum === 7) {
      proximoPasso = `Ligação caiu durante a Etapa 7 (validação). ${nomeResolvido ? `Nome: ${nomeResolvido}. ` : ''}Veja as últimas falas abaixo e retome a validação de onde parou.`
    } else {
      const aviso = highestStageNum > etapaNum ? ` A lead já chegou até a Etapa ${highestStageNum} em ligações anteriores — não regride.` : ''
      proximoPasso = `Retome a conversa${nomeResolvido ? ` com ${nomeResolvido}` : ''} de forma natural, sem repetir etapas já concluídas.${aviso} Veja as últimas falas abaixo.`
    }

    // Last 10 turns of the merged transcript — injected for ALL stages
    const lastTurnsBlock = (() => {
      const lastTurns = allTranscripts.slice(-10)
      if (!lastTurns.length) return ''
      const lines = lastTurns.map((t: any) => {
        const role = (t.role === 'assistant' || t.role === 'ana') ? 'ANA' : 'LEAD'
        return `${role}: ${(t.text || '').trim()}`
      }).join('\n')
      return `\n\n--- ÚLTIMAS FALAS ANTES DA LIGAÇÃO CAIR ---\n${lines}\n--- CONTINUE A PARTIR DAQUI ---`
    })()

    const contextBlock = `

--- RETOMADA DE LIGAÇÃO ANTERIOR ---
Esta lead já foi contactada anteriormente mas a ligação caiu antes de concluir.
Retome de forma natural, sem repetir etapas já concluídas.
${etapas.join('\n')}
Próximo passo: ${proximoPasso}${lastTurnsBlock}
--- FIM RETOMADA ---`

    return { prevState: 'resume', contextBlock, metodoEscolhido, nomeLead: nomeResolvido ?? nomeLead, tokenIndicacao, pagamentoConfirmado, referidosInfo: referidosInfo ?? undefined }
  } catch (e: any) {
    console.error('[CTX] buildSessionContext erro:', e.message)
    return { prevState: 'fresh', contextBlock: '' }
  }
}
