import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ANA_BASE_PROMPT, STAGE_INSTRUCTIONS } from '@/lib/ana-master/constants'
import { ACTIVE_PROFILE, VOICE_BEHAVIOR_PROFILES } from '@/lib/ana-master/runtime-profile'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Exact same 3 tools as test-chat.mjs (FASE A) — no VAPI-era extras
const TOOLS = [
  {
    type: 'function',
    name: 'gateValidator',
    description: 'Valida e registra a conclusão de uma etapa, avançando para a próxima. O resultado é INTERNO — nunca verbalize nem mencione para a lead.',
    parameters: {
      type: 'object',
      properties: {
        gate_id: { type: 'string', enum: ['GATE_ABERTURA','GATE_CONEXAO','GATE_COMBINADO','GATE_SPEECH','GATE_FECHAMENTO','GATE_PAGAMENTO','GATE_REFERIDOS','GATE_VALIDACAO'] },
        nome_confirmado: { type: 'boolean' },
        referida_confirmada: { type: 'boolean' },
        disponibilidade_confirmada: { type: 'boolean' },
        rotina_compreendida: { type: 'boolean' },
        sintomas_identificados: { type: 'boolean' },
        dor_prioritaria: { type: 'boolean' },
        personalizacao_possivel: { type: 'boolean' },
        interesse_confirmado: { type: 'boolean' },
        permissao_combinado: { type: 'boolean' },
        combinado_confirmado: { type: 'boolean' },
        decisao_saude_respondida: { type: 'boolean' },
        viagem_respondida: { type: 'boolean' },
        pendencia_decisor: { type: 'boolean' },
        speech_progress_complete: { type: 'boolean' },
        parte1_entregue: { type: 'boolean' },
        parte2_entregue: { type: 'boolean' },
        parte3_entregue: { type: 'boolean' },
        parte4_entregue: { type: 'boolean' },
        pergunta_final_feita: { type: 'boolean' },
        resposta_lead_recebida: { type: 'boolean' },
        interesse_pos_speech: { type: 'boolean' },
        interesse_protocolo: { type: 'string' },
        investimento_apresentado: { type: 'boolean' },
        forma_pagamento_escolhida: { type: 'string', enum: ['pix', 'cartao'] },
        parcelamento_6x_mencionado: { type: 'boolean' },
        telefone: { type: 'string' },
        token_indicacao: { type: 'string' },
        negativas_verificadas: { type: 'boolean' },
      },
      required: ['gate_id'],
    },
  },
  {
    type: 'function',
    name: 'registrar_parte_speech',
    description: 'Registra que uma parte do Speech foi concluída. SOMENTE chame depois de entregar completamente a parte. Nunca chame partes fora de ordem. NUNCA verbalize esta ação — proibido dizer "vou registrar", "vou salvar", "vou avançar", "agora vou para a próxima parte" ou qualquer referência ao mecanismo interno.',
    parameters: {
      type: 'object',
      properties: {
        parte: {
          oneOf: [
            { type: 'integer', enum: [1, 2, 3, 4] },
            { type: 'string', enum: ['pergunta_feita', 'resposta_recebida'] },
          ],
        },
      },
      required: ['parte'],
    },
  },
  {
    type: 'function',
    name: 'save_memory',
    description: 'Salva uma informação importante sobre a lead. Use source="lead_explicit" apenas quando a lead disse literalmente — não resuma ou infira.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        value: { type: 'string' },
        source: { type: 'string', enum: ['lead_explicit', 'model_inferred', 'backend_fact', 'system_config'] },
        raw_evidence: { type: 'string', description: 'Trecho literal da fala da lead (obrigatório quando source=lead_explicit)' },
      },
      required: ['key', 'value', 'source'],
    },
  },
]

export async function POST(req: NextRequest) {
  try {
    const { telefone, nome } = await req.json()

    if (!telefone) {
      return NextResponse.json({ error: 'telefone obrigatório' }, { status: 400 })
    }

    const callSid = `sim-browser-${Date.now()}`
    const digits = String(telefone).replace(/\D/g, '')
    const norm = digits.startsWith('55') ? digits : `55${digits}`

    // Create call record in Supabase
    await supabase.from('ana_calls').insert({
      call_sid: callSid,
      telefone: norm,
      stage: 'apresentacao',
      status: 'active',
      gates_passed: [],
      memories: { nome: nome ?? '', telefone: norm, sim_browser: true, profile_version: ACTIVE_PROFILE.version },
    })

    // Create OpenAI Realtime ephemeral session
    const vbp = VOICE_BEHAVIOR_PROFILES['apresentacao'] ?? ''
    const systemPrompt = `${ANA_BASE_PROMPT}\n\nINÍCIO: Você inicia a conversa. Comece agora pela Etapa 1.\n\n${STAGE_INSTRUCTIONS.apresentacao}\n\n${vbp}`

    const oaiRes = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ACTIVE_PROFILE.model,
        voice: ACTIVE_PROFILE.voice,
        instructions: systemPrompt,
        tools: TOOLS,
        tool_choice: 'auto',
        modalities: ['audio', 'text'],
        input_audio_transcription: { model: ACTIVE_PROFILE.transcription_model },
        turn_detection: ACTIVE_PROFILE.vad,
      }),
    })

    if (!oaiRes.ok) {
      const err = await oaiRes.text()
      return NextResponse.json({ error: `OpenAI error: ${err}` }, { status: 500 })
    }

    const session = await oaiRes.json()

    return NextResponse.json({
      callSid,
      telefone: norm,
      clientSecret: session.client_secret?.value,
      sessionId: session.id,
      model: ACTIVE_PROFILE.model,
      profileVersion: ACTIVE_PROFILE.version,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
