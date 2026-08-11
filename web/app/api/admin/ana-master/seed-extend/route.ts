import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const TURNS = [
  {
    turn_number: 1, stage: 'apresentacao', speaker: 'ANA',
    content: 'Oi Maria! Aqui é a Ana, da clínica do Dr. Vinícius. A Adriana me passou seu contato e disse que você poderia se beneficiar com o que a gente faz aqui. Ela inclusive me disse que chegou a te mandar uma mensagem antes de eu ligar — chegou a ver algo?',
    text_source: 'RECONSTRUCTED',
    behavioral_intent: 'Abertura quente por referido. Ancora na indicadora. Verifica a mensagem prévia antes de prosseguir.',
    gold_moment: true,
    gold_marker: 'Gold 01 — Contextualização por referido',
    creates_memory: 'referida_por',
    gate_passed: 'GATE_ABERTURA',
  },
  {
    turn_number: 2, stage: 'conexao', speaker: 'ANA',
    content: 'Que ótimo que chegou! Antes de tudo, me fala um pouco sobre você — sua rotina, o que você faz, como está seu dia a dia hoje.',
    text_source: 'RECONSTRUCTED',
    behavioral_intent: 'Abre DI sem questionário. Convida para relato espontâneo de rotina e contexto de vida.',
    gold_moment: true,
    gold_marker: 'Gold 02 — Conexão aberta',
    creates_memory: 'contexto_vida',
  },
  {
    turn_number: 3, stage: 'di', speaker: 'ANA',
    content: 'Entendo, Maria. Olha, eu quero te mostrar o que a gente faz aqui. E ao final, se fizer sentido pra você, a gente avança. Se não fizer, tudo bem também — você me diz não sem problema nenhum. Combinado?',
    text_source: 'RECONSTRUCTED',
    behavioral_intent: 'Pré-fechamento. Cria contrato leve de decisão. Reduz pressão percebida antes do speech.',
    gold_moment: true,
    gold_marker: 'Gold 03 — Combinado / pré-fechamento',
    gate_passed: 'GATE_DI',
  },
  {
    turn_number: 4, stage: 'speech', speaker: 'ANA',
    content: 'Perfeito. Então deixa eu te explicar. O que a gente faz é o protocolo de otimização hormonal com implante — um procedimento minimamente invasivo, feito pelo Dr. Vinícius, que libera hormônio de forma contínua por meses. Muitas mulheres relatam mais disposição, sono melhor, humor mais estável. Sem picos, sem rollercoaster.',
    text_source: 'RECONSTRUCTED',
    behavioral_intent: 'Speech adaptado ao contexto da lead. Benefícios relatados, não prometidos individualmente. Tom explicativo, não comercial.',
    creates_memory: 'interesse_protocolo',
  },
  {
    turn_number: 5, stage: 'fechamento', speaker: 'ANA',
    content: 'Faz sentido pra você, Maria? O que você acha?',
    text_source: 'RECONSTRUCTED',
    behavioral_intent: 'Fechamento direto após speech. Pergunta aberta — não pressiona, convida decisão.',
    gate_passed: 'GATE_SPEECH',
  },
  {
    turn_number: 6, stage: 'fechamento', speaker: 'ANA',
    content: 'Entendo. Me diz uma coisa — é a única razão que te impede de avançar agora? Se a gente resolver isso, faz sentido pra você?',
    text_source: 'RECONSTRUCTED',
    behavioral_intent: 'Objeção financeira. Isola a causa antes de oferecer alternativa. Não negocia contra si mesmo.',
    gold_moment: true,
    gold_marker: 'Gold 04 — Objeção financeira — isolar antes de oferecer',
    consumes_memory: 'contexto_vida',
    gate_passed: 'GATE_OBJECAO',
  },
  {
    turn_number: 7, stage: 'referidos', speaker: 'ANA',
    content: 'Você chegou aqui porque a Adriana te indicou, certo? Ela quis te dar uma oportunidade que alguém deu pra ela. Agora que você está entrando, quem na sua vida você acha que merece a mesma oportunidade?',
    text_source: 'RECONSTRUCTED',
    behavioral_intent: 'Pedido de referidos por reciprocidade. Recupera a história da indicadora. Sentido antes de ação.',
    gold_moment: true,
    gold_marker: 'Gold 05 — Referidos por reciprocidade',
    consumes_memory: 'referida_por',
    gate_passed: 'GATE_REFERIDOS',
  },
  {
    turn_number: 8, stage: 'validacao', speaker: 'ANA',
    content: 'Perfeito, Maria. Só mais uma coisa antes de finalizarmos — qual é a sua profissão? E você tem algum hobby ou atividade que pratica regularmente?',
    text_source: 'RECONSTRUCTED',
    behavioral_intent: 'Gate de validação. Coleta dados obrigatórios antes de GANHO. Não encerra antes de concluir a Etapa 8.',
    gold_moment: true,
    gold_marker: 'Gold 06 — Validação antes de GANHO',
    consumes_memory: 'contexto_vida',
    gate_passed: 'GATE_VALIDACAO',
  },
]

const MEMORIES = [
  {
    memory_key: 'referida_por',
    fact_captured: 'Adriana indicou Maria e enviou mensagem prévia antes da ligação',
    origin_stage: 'apresentacao',
    reused_stage: 'referidos',
    commercial_function: 'Ancora abertura, cria reciprocidade no pedido de referidos',
  },
  {
    memory_key: 'contexto_vida',
    fact_captured: 'Rotina, trabalho e contexto de vida revelados espontaneamente pela lead',
    origin_stage: 'conexao',
    reused_stage: 'fechamento',
    commercial_function: 'Personaliza speech e objeção; evita questionário frio',
  },
  {
    memory_key: 'interesse_protocolo',
    fact_captured: 'Lead demonstrou interesse no protocolo de otimização hormonal',
    origin_stage: 'speech',
    reused_stage: 'fechamento',
    commercial_function: 'Confirma fit antes do fechamento; referência na objeção',
  },
  {
    memory_key: 'objecao_financeira',
    fact_captured: 'Objeção foi de natureza financeira — isolada antes de oferecer alternativa',
    origin_stage: 'fechamento',
    reused_stage: 'validacao',
    commercial_function: 'Evita negociação prematura; mantém valor percebido',
  },
  {
    memory_key: 'dados_validacao',
    fact_captured: 'Profissão e hobby coletados na validação — dados obrigatórios para GANHO',
    origin_stage: 'validacao',
    reused_stage: null,
    commercial_function: 'Gate final — sem esses dados o estado não vira GANHO',
  },
]

export async function POST() {
  try {
    // Find the foundational simulation
    const { data: simRows } = await supabase
      .from('ana_simulacoes')
      .select('id')
      .ilike('titulo', '%Simulação Fundacional%')
      .limit(1)

    if (!simRows || simRows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Simulação Fundacional não encontrada. Rode /api/admin/ana-master/seed primeiro.' }, { status: 404 })
    }

    const simId = simRows[0].id
    const now = new Date().toISOString()

    // Check if already extended
    const { data: existingTurns } = await supabase
      .from('ana_simulation_turns')
      .select('id')
      .eq('simulation_id', simId)
      .limit(1)

    if (existingTurns && existingTurns.length > 0) {
      return NextResponse.json({ ok: false, message: 'Turnos já existem para esta simulação. Já foi extended.' })
    }

    const errors: string[] = []

    // 1. Update sim metadata
    const { error: updateErr } = await supabase
      .from('ana_simulacoes')
      .update({
        simulation_type: 'fundacional',
        consultant: 'Dr. Vinícius Sechella',
        lead_name: 'Maria (ChatGPT)',
        lead_origin: 'Referido — Adriana',
        referrer_name: 'Adriana',
        dna_version: 'v1',
        gold_reference: true,
        immutable_reference: true,
        updated_at: now,
      })
      .eq('id', simId)
    if (updateErr) errors.push(`update_sim: ${updateErr.message}`)

    // 2. Insert turns
    const turnsPayload = TURNS.map(t => ({ ...t, simulation_id: simId, created_at: now }))
    const { error: turnsErr } = await supabase.from('ana_simulation_turns').insert(turnsPayload)
    if (turnsErr) errors.push(`turns: ${turnsErr.message}`)

    // 3. Insert memories
    const memoriesPayload = MEMORIES.map(m => ({ ...m, simulation_id: simId, created_at: now }))
    const { error: memErr } = await supabase.from('ana_simulation_memories').insert(memoriesPayload)
    if (memErr) errors.push(`memories: ${memErr.message}`)

    if (errors.length > 0) {
      return NextResponse.json({ ok: false, errors }, { status: 207 })
    }

    return NextResponse.json({
      ok: true,
      simulation_id: simId,
      extended: { turns: TURNS.length, memories: MEMORIES.length },
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
