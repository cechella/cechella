import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GATE_TRANSITIONS, STAGE_INSTRUCTIONS, ANA_BASE_PROMPT } from '@/lib/ana-master/constants'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text'
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'
const APP_URL = 'https://www.hormoneecosystem.com'

async function zapiSend(phone: string, message: string) {
  const digits = String(phone).replace(/\D/g, '')
  const normalized = digits.startsWith('55') ? digits : `55${digits}`
  try {
    await fetch(ZAPI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
      body: JSON.stringify({ phone: normalized, message }),
    })
  } catch {}
}

async function getOrCreateReferidosToken(telefone: string, callSid: string): Promise<string | null> {
  try {
    const res = await fetch(`${APP_URL}/api/admin/ana-master/simulador/referidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefone, callSid }),
    })
    const data = await res.json()
    return data.token ?? null
  } catch { return null }
}

async function getMemories(callSid: string): Promise<Record<string, unknown>> {
  const { data } = await supabase.from('ana_calls').select('memories').eq('call_sid', callSid).single()
  return (data?.memories as Record<string, unknown>) ?? {}
}

async function getCallStage(callSid: string): Promise<string | null> {
  const { data } = await supabase.from('ana_calls').select('stage').eq('call_sid', callSid).single()
  return (data as any)?.stage ?? null
}

async function verifyPayment(telefone: string): Promise<boolean> {
  const digits = String(telefone).replace(/\D/g, '')
  const { data } = await supabase
    .from('leads')
    .select('status_pagamento')
    .or(`telefone.eq.${digits},telefone.eq.55${digits},telefone.eq.${digits.replace(/^55/, '')}`)
    .maybeSingle()
  return data?.status_pagamento === 'pago'
}

// Queries contatos_referidos (saved by /api/indicar) by lead phone
async function checkReferidosByPhone(phone: string) {
  const digits = String(phone).replace(/\D/g, '')
  const { data } = await supabase
    .from('contatos_referidos')
    .select('id, profissao, hobby, status')
    .or(`indicado_por_telefone.eq.${digits},indicado_por_telefone.eq.55${digits},indicado_por_telefone.eq.${digits.replace(/^55/, '')}`)

  if (!data || data.length === 0) return { completo: false, semDados: 20, missaoCompleta: false, total: 0 }
  const ativos = data.filter((r: any) => r.status !== 'recusou')
  const semDados = ativos.filter((r: any) => !r.profissao || !r.hobby).length
  const completo = ativos.length >= 20
  return { completo, semDados, missaoCompleta: completo && semDados === 0, total: ativos.length }
}

export async function POST(req: NextRequest) {
  try {
    const { callSid, gateId, evidence, telefone } = await req.json()

    if (!callSid || !gateId) {
      return NextResponse.json({ approved: false, reason: 'callSid e gateId obrigatórios' }, { status: 400 })
    }

    const transition = GATE_TRANSITIONS[gateId]
    if (!transition) {
      return NextResponse.json({ approved: false, reason: `Gate desconhecido: ${gateId}` })
    }

    // Stage invariant check
    const currentStage = await getCallStage(callSid)
    if (currentStage !== transition.from) {
      return NextResponse.json({
        approved: false,
        reason: `${gateId} bloqueado — stage atual é "${currentStage}", mas este gate exige "${transition.from}".`,
      })
    }

    const ev = evidence || {}

    // ── Evidence validation per gate ──────────────────────────────────────────
    switch (gateId) {
      case 'GATE_ABERTURA':
        if (!ev.nome_confirmado) return NextResponse.json({ approved: false, reason: 'Nome da lead não foi confirmado.' })
        if (!ev.referida_confirmada) return NextResponse.json({ approved: false, reason: 'Quem indicou não foi identificado.' })
        if (!ev.disponibilidade_confirmada) return NextResponse.json({ approved: false, reason: 'Lead não confirmou disponibilidade.' })
        break

      case 'GATE_CONEXAO': {
        if (!ev.rotina_compreendida) return NextResponse.json({ approved: false, reason: 'Contexto de vida/rotina não foi compreendido.' })
        if (!ev.sintomas_identificados) return NextResponse.json({ approved: false, reason: 'Sintomas não foram identificados.' })
        if (!ev.dor_prioritaria) return NextResponse.json({ approved: false, reason: 'Dor prioritária não identificada.' })
        if (!ev.personalizacao_possivel) return NextResponse.json({ approved: false, reason: 'Contexto insuficiente para personalizar.' })
        if (!ev.interesse_confirmado) return NextResponse.json({ approved: false, reason: 'Lead não confirmou interesse no implante.' })
        const mConexao = await getMemories(callSid)
        if (!mConexao.dor_principal) {
          return NextResponse.json({ approved: false, reason: 'Memória dor_principal ausente — salve o sintoma principal via save_memory antes de avançar.' })
        }
        break
      }

      case 'GATE_COMBINADO': {
        if (!ev.permissao_combinado) return NextResponse.json({ approved: false, reason: 'Permissão para o combinado não foi pedida.' })
        if (!ev.combinado_confirmado) return NextResponse.json({ approved: false, reason: 'Lead não confirmou o combinado.' })
        if (!ev.decisao_saude_respondida) return NextResponse.json({ approved: false, reason: 'Pergunta sobre autonomia de decisão não foi feita.' })
        if (!ev.viagem_respondida) return NextResponse.json({ approved: false, reason: 'Pergunta sobre viagem não foi feita.' })
        if (ev.pendencia_decisor) return NextResponse.json({ approved: false, reason: 'Lead depende de terceiro para decidir. Seguir branch decisor compartilhado.' })
        const mCombinado = await getMemories(callSid)
        if (!mCombinado.combinado_confirmado) {
          return NextResponse.json({ approved: false, reason: 'Memória combinado_confirmado ausente — a lead ainda não confirmou o combinado.' })
        }
        break
      }

      case 'GATE_SPEECH':
        if (!ev.speech_progress_complete) return NextResponse.json({ approved: false, reason: 'Speech Progress incompleto.' })
        if (!ev.parte1_entregue) return NextResponse.json({ approved: false, reason: 'Parte 1 não entregue.' })
        if (!ev.parte2_entregue) return NextResponse.json({ approved: false, reason: 'Parte 2 não entregue.' })
        if (!ev.parte3_entregue) return NextResponse.json({ approved: false, reason: 'Parte 3 não entregue.' })
        if (!ev.parte4_entregue) return NextResponse.json({ approved: false, reason: 'Parte 4 não entregue.' })
        if (!ev.pergunta_final_feita) return NextResponse.json({ approved: false, reason: 'Pergunta final obrigatória não foi feita.' })
        if (!ev.resposta_lead_recebida) return NextResponse.json({ approved: false, reason: 'Resposta da lead à pergunta final não foi recebida.' })
        if (!ev.interesse_pos_speech) return NextResponse.json({ approved: false, reason: 'Lead não demonstrou interesse suficiente.' })
        break

      case 'GATE_FECHAMENTO':
        if (!ev.investimento_apresentado) return NextResponse.json({ approved: false, reason: 'Investimento de R$ 5.000 não apresentado.' })
        if (!ev.forma_pagamento_escolhida) return NextResponse.json({ approved: false, reason: 'Lead não escolheu forma de pagamento.' })
        if (ev.parcelamento_6x_mencionado === false) return NextResponse.json({ approved: false, reason: 'Parcelamento deve ser apresentado como ATÉ 6X SEM JUROS.' })
        break

      case 'GATE_PAGAMENTO': {
        // Sim bypass — browser simulator sessions skip real payment check
        if (callSid.startsWith('sim-browser-')) break
        const tel = telefone || ev.telefone
        if (!tel) return NextResponse.json({ approved: false, reason: 'Telefone necessário para verificar pagamento.' })
        const pago = await verifyPayment(tel)
        if (!pago) return NextResponse.json({ approved: false, reason: 'Pagamento ainda não confirmado no sistema.' })
        break
      }

      case 'GATE_REFERIDOS': {
        // Use contatos_referidos table (saved by /api/indicar) keyed by phone
        const { data: callRow } = await supabase.from('ana_calls').select('telefone').eq('call_sid', callSid).single()
        const phone = String(callRow?.telefone || ev.telefone || telefone || '').replace(/\D/g, '')
        if (!phone) return NextResponse.json({ approved: false, reason: 'Telefone não encontrado para verificar referidos.' })
        const ref = await checkReferidosByPhone(phone)
        if (!ref.missaoCompleta) {
          if (ref.semDados > 0) return NextResponse.json({ approved: false, reason: `${ref.semDados} indicadas ainda sem profissão/hobby. Total ativas: ${ref.total}.` })
          return NextResponse.json({ approved: false, reason: `Meta de 20 indicadas ainda não atingida. Total ativas: ${ref.total}.` })
        }
        break
      }

      case 'GATE_VALIDACAO': {
        if (!ev.negativas_verificadas) return NextResponse.json({ approved: false, reason: 'Verificação de negativas não executada.' })
        const { data: callRowV } = await supabase.from('ana_calls').select('telefone').eq('call_sid', callSid).single()
        const phoneV = String(callRowV?.telefone || ev.telefone || telefone || '').replace(/\D/g, '')
        if (phoneV) {
          const ref = await checkReferidosByPhone(phoneV)
          if (!ref.missaoCompleta) return NextResponse.json({ approved: false, reason: `Referidos incompletos. semDados=${ref.semDados}, total=${ref.total}.` })
        }
        break
      }
    }

    // ── Atomic transition via Supabase RPC ────────────────────────────────────
    const { data: rpcData, error: rpcError } = await supabase.rpc('gate_transition', {
      p_call_sid:   callSid,
      p_gate_id:    gateId,
      p_from_stage: transition.from,
      p_to_stage:   transition.to,
      p_evidence:   ev,
    })

    if (rpcError) {
      return NextResponse.json({ approved: false, reason: `RPC error: ${rpcError.message}` })
    }

    const rpc = rpcData as { transitioned: boolean; reason: string }
    if (!rpc.transitioned) {
      return NextResponse.json({ approved: false, reason: rpc.reason })
    }

    // Save checkpoint to memories so Sessões tab can show gate timeline
    {
      const { data: memRow } = await supabase.from('ana_calls').select('memories').eq('call_sid', callSid).single()
      const mem = ((memRow?.memories ?? {}) as Record<string, unknown>)
      const checkpoints = ((mem.checkpoints ?? {}) as Record<string, unknown>)
      checkpoints[gateId] = { stage: transition.to, ts: new Date().toISOString(), evidence: ev }
      mem.checkpoints = checkpoints
      await supabase.from('ana_calls').update({ memories: mem }).eq('call_sid', callSid)
    }

    // Post-transition: WhatsApp sends
    const { data: callData } = await supabase.from('ana_calls').select('telefone, memories').eq('call_sid', callSid).single()
    const leadTelefone = (callData?.telefone as string) || telefone || ''
    const leadMem = ((callData?.memories ?? {}) as Record<string, unknown>)

    if (gateId === 'GATE_FECHAMENTO' && leadTelefone) {
      const forma = String(ev.forma_pagamento_escolhida || leadMem.forma_pagamento_escolhida || 'pix').toLowerCase()
      if (forma === 'pix') {
        await zapiSend(leadTelefone,
          `💳 *Pagamento via PIX*\n\nAdriana, aqui está seu link de pagamento seguro:\n\n👉 ${APP_URL}/pagamento/pix?telefone=${encodeURIComponent(leadTelefone)}\n\n🔒 Ambiente 100% seguro. Após o PIX, me avise aqui! 🎯`
        )
      } else {
        await zapiSend(leadTelefone,
          `💳 *Pagamento via Cartão*\n\nAqui está seu link de pagamento seguro 👇\n\n👉 ${APP_URL}/pagamento/cartao?telefone=${encodeURIComponent(leadTelefone)}\n\n🔒 Ambiente 100% seguro — Mercado Pago`
        )
      }
    }

    if (gateId === 'GATE_PAGAMENTO' && leadTelefone) {
      const token = await getOrCreateReferidosToken(leadTelefone, callSid)
      if (token) {
        const link = `${APP_URL}/indicar/${token}`
        // Save token to memories
        const mem = ((callData?.memories ?? {}) as Record<string, unknown>)
        mem.token_indicacao = token
        await supabase.from('ana_calls').update({ memories: mem }).eq('call_sid', callSid)
        await zapiSend(leadTelefone,
          `✨ *Seu link especial de indicações chegou!* 💜\n\n👉 ${link}\n\nCompartilhe com suas amigas e ganhe benefícios especiais! 🎁`
        )
      }
    }

    // Post-transition: update leads table for GANHO
    if (gateId === 'GATE_VALIDACAO') {
      if (leadTelefone) {
        const t = leadTelefone
        await supabase
          .from('leads')
          .update({ etapa: 'ganho', etapa_agente: 8, updated_at: new Date().toISOString() })
          .or(`telefone.eq.${t},telefone.eq.55${t},telefone.eq.${t.replace(/^55/, '')}`)
      }
    }

    const nextInstructions = `${ANA_BASE_PROMPT}\n\n${STAGE_INSTRUCTIONS[transition.to] ?? ''}`

    return NextResponse.json({
      approved: true,
      reason: `${gateId} aprovado.`,
      next_stage: transition.to,
      next_instructions: nextInstructions,
    })
  } catch (e: any) {
    return NextResponse.json({ approved: false, reason: e.message }, { status: 500 })
  }
}
