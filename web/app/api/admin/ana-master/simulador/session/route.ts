import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ANA_BASE_PROMPT, STAGE_INSTRUCTIONS, REALTIME_MODEL, REALTIME_VOICE } from '@/lib/ana-master/constants'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TOOLS = [
  {
    type: 'function',
    name: 'gateValidator',
    description: 'Valida o gate atual no servidor. Chame quando a etapa estiver concluída. O resultado é INTERNO — nunca verbalize nem mencione para a lead.',
    parameters: {
      type: 'object',
      properties: {
        gate_id: { type: 'string', description: 'ID do gate (ex: GATE_ABERTURA)' },
        evidence: { type: 'object', description: 'Evidências coletadas nesta etapa', additionalProperties: true },
      },
      required: ['gate_id', 'evidence'],
    },
  },
  {
    type: 'function',
    name: 'get_lead_context',
    description: 'Recupera contexto da lead: nome, quem indicou, histórico de memórias.',
    parameters: { type: 'object', properties: {} },
  },
  {
    type: 'function',
    name: 'save_memory',
    description: 'Salva uma informação importante da lead para uso posterior.',
    parameters: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Chave da memória (ex: dor_principal)' },
        value: { type: 'string', description: 'Valor a salvar' },
      },
      required: ['key', 'value'],
    },
  },
  {
    type: 'function',
    name: 'verificar_pagamento',
    description: 'Verifica no sistema se o pagamento da lead foi confirmado.',
    parameters: { type: 'object', properties: {} },
  },
  {
    type: 'function',
    name: 'iniciar_coleta_referidos',
    description: 'Gera o link de indicações da lead. SOMENTE após pagamento confirmado. O link é o ÚNICO canal — nunca colete contatos por voz.',
    parameters: { type: 'object', properties: {} },
  },
  {
    type: 'function',
    name: 'verificar_referidos',
    description: 'Verifica o progresso do formulário de indicações. Chame a cada 2 minutos após enviar o link.',
    parameters: { type: 'object', properties: {} },
  },
  {
    type: 'function',
    name: 'registrar_parte_speech',
    description: 'Registra que uma parte do Speech foi concluída. SOMENTE chame depois de entregar completamente a parte. NUNCA chame partes fora de ordem. NUNCA verbalize esta ação.',
    parameters: {
      type: 'object',
      properties: {
        parte: {
          description: 'Qual parte ou marco foi concluído',
          oneOf: [
            { type: 'number', enum: [1, 2, 3, 4] },
            { type: 'string', enum: ['pergunta_feita', 'resposta_recebida'] },
          ],
        },
      },
      required: ['parte'],
    },
  },
  {
    type: 'function',
    name: 'send_whatsapp',
    description: 'Envia uma mensagem de texto no WhatsApp da lead.',
    parameters: {
      type: 'object',
      properties: { mensagem: { type: 'string', description: 'Texto a enviar' } },
      required: ['mensagem'],
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
      memories: { nome: nome ?? '', telefone: norm, sim_browser: true },
    })

    // Create OpenAI Realtime ephemeral session
    const systemPrompt = `${ANA_BASE_PROMPT}\n\nINÍCIO: Você inicia a conversa. Comece agora pela Etapa 1.\n\n${STAGE_INSTRUCTIONS.apresentacao}`

    const oaiRes = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: REALTIME_MODEL,
        voice: REALTIME_VOICE,
        instructions: systemPrompt,
        tools: TOOLS,
        tool_choice: 'auto',
        modalities: ['audio', 'text'],
        input_audio_transcription: { model: 'gpt-4o-transcribe' },
        turn_detection: {
          type: 'server_vad',
          silence_duration_ms: 600,
          threshold: 0.5,
          prefix_padding_ms: 300,
        },
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
      model: REALTIME_MODEL,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
