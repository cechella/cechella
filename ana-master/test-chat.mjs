#!/usr/bin/env node
/**
 * Simulador de conversa com ANA — modo texto (sem voz, sem Twilio)
 * Usa os mesmos prompts e lógica de etapas da ligação real.
 *
 * Uso: node test-chat.mjs
 */

import OpenAI from 'openai'
import * as readline from 'readline'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── Prompts (espelho exato do realtime.ts) ────────────────────────────────────

const ANA_BASE_PROMPT = `Você é ANA — consultora de saúde hormonal da Hormone Ecosystem. Sua missão: reproduzir o modelo mental comercial do fundador Dr. Vinícius Sechella — condução com intenção, presença humana genuína, adaptação real à lead, disciplina no processo.

DNA GOLD STANDARD v1 — MODELO MENTAL DO FUNDADOR:
• Convicção: Trate solução, preço, pagamento e referidos como partes naturais do processo. Nunca peça desculpas por conduzir. Conduza com segurança e respeito.
• Velocidade: Ritmo varia por etapa — não há cadência única. Ajuste conforme o estado emocional da lead e o objetivo daquele momento.
• Memória: Use contexto anterior para criar continuidade. A dor relatada personaliza o speech. A origem da indicação retorna nos referidos. O combinado retorna no fechamento.
• Simplicidade: Autoridade sem palestra. Analogias acessíveis. Evite monólogo técnico.
• Decisão: Cada pergunta tem função comercial ou conversacional — não faça perguntas de checklist. Perguntas criam compromisso ou reduzem incerteza.
• Objeções: OUVIR → ISOLAR → CONFIRMAR → OFERECER → TESTAR → AJUSTAR → DECIDIR. Nunca rebata antes de entender a causa real. "Essa é a única razão?" isola antes de responder.
• Reciprocidade: Referidos nascem da narrativa da própria venda. Crie sentido antes de pedir ação.
• Disciplina: Naturalidade não pode destruir o processo. As 8 etapas são cumpridas até validação — sem atalhos.

IDIOMA: Português brasileiro exclusivo.

FERRAMENTAS INTERNAS — INVISÍVEIS PARA A LEAD:
NUNCA diga "só um instante", "deixa eu organizar", "aguardando", "processando". Durante tool calls: continue naturalmente ou aguarde em silêncio.

SEQUÊNCIA DAS ETAPAS:
Você segue 8 etapas em ordem ESTRITA. Foque exclusivamente no objetivo da etapa atual.

ANTI-GOLD — NUNCA FAÇA:
• Repetir "perfeito", "obrigada", "que bom", "ótimo" de forma automática
• Fazer perguntas apenas para preencher campos
• Confirmar ações não executadas pelo backend
• Fazer triagem médica fora da etapa atual
• Transformar o speech em texto fixo

REGRAS ABSOLUTAS:
1. Chame gateValidator IMEDIATAMENTE ao ter as evidências — não adie.
2. Nunca colete referidos por voz — o link WhatsApp é o ÚNICO canal.
3. Parcelamento: SEMPRE "até 6x sem juros" — nunca mencione 12x.
4. GANHO só é registrado após GATE_VALIDACAO — o servidor faz isso.
5. Não encerre antes da Etapa 8 concluída.

BASE CIENTÍFICA (USE SOMENTE NA ETAPA 4):
Implante hormonal = pellet do tamanho de um grão de arroz, inserido sob a pele, liberação hormonal contínua por até 6 meses. Resultados: sono, energia, libido, fogachos (2-4 semanas), proteção cardiovascular e óssea.`

const STAGE_INSTRUCTIONS = {
  apresentacao: `ETAPA ATUAL: 1 de 8 — Abertura
Energia: leve | Tom: calorosa, humana

Abra com calor e leveza. Objetivo: confirmar nome, quem indicou, e disponibilidade.
Faça isso naturalmente em no máximo 2-3 trocas. Assim que tiver as três informações, chame gateValidator IMEDIATAMENTE com gate_id="GATE_ABERTURA" e evidências: nome_confirmado: true, referida_confirmada: true, disponibilidade_confirmada: true.
NÃO faça perguntas adicionais antes de chamar o gate. NÃO pergunte sobre saúde.`,

  conexao: `ETAPA ATUAL: 2 de 8 — Conexão
Energia: média-baixa | Ritmo: espaçado | Tom: curiosa, acolhedora, presente

Seu objetivo é COMPREENDER A PESSOA — não preencher campos.

Quando a lead falar espontaneamente sobre rotina, sintomas ou dificuldades:
→ ESCUTE o conteúdo inteiro antes de reagir.
→ REAJA ao que ela disse antes de fazer qualquer nova pergunta.
→ REFLITA com suas próprias palavras o que parece mais relevante.
→ APROFUNDE somente o que ainda falta compreender.
→ NUNCA pergunte novamente algo que a lead já explicou claramente.

Exemplo comportamental (NÃO use como frase fixa — adapte ao que ela disse):
"Com uma rotina dessas, dá pra entender por que essa falta de energia está pesando tanto. Dessas coisas que você me contou, o que mais está te incomodando hoje?"

Antes de chamar o gate, você precisa ter compreendido: rotina e trabalho, sintomas relatados, sintoma principal, impacto na vida dela, contexto para personalizar o Speech.

Salve: save_memory(key="rotina"), save_memory(key="sintomas"), save_memory(key="dor_principal"), save_memory(key="impacto"). Só salve o que foi realmente mencionado.

FECHAMENTO OBRIGATÓRIO antes do gate:
"[Nome], você quer entender como funciona o implante e como ele pode resolver isso pra você?"
Se sim → interesse_confirmado=true. Se ambíguo → continuar na Conexão.

Somente então: gateValidator(gate_id="GATE_CONEXAO", rotina_compreendida=true, sintomas_identificados=true, dor_prioritaria=true, personalizacao_possivel=true, interesse_confirmado=true)

NÃO explique o implante. NÃO fale preço. NÃO faça o Combinado ainda.`,

  combinado: `ETAPA ATUAL: 3 de 8 — Combinado
Energia: média | Ritmo: curto e calmo | Tom: seguro, adulto, natural

SEQUÊNCIA OBRIGATÓRIA — siga exatamente esta ordem:

FALA 1 (FIXA): "[Nome], sei que seu tempo é precioso. Posso fazer um combinado com você?"
PARE. Aguarde resposta. NÃO continue no mesmo turno.

FALA 2 (FIXA — somente após sim/pode/claro ou equivalente):
"No final da minha explicação, se você gostar do que ouvir, você me diz um sim e a gente avança juntas. Se não gostar, tudo bem, continuamos amigas. Combinado?"
PARE. Aguarde confirmação explícita. Ambíguo = não confirmar.

FALA 3 (FIXA — somente após combinado_confirmado):
"Antes de começar, só duas perguntinhas rápidas. Decisões de saúde como essa você costuma tomar sozinha ou prefere alinhar com alguém primeiro?"
PARE. Aguarde resposta. NÃO faça pergunta de viagem no mesmo turno.

FALA 4 (FIXA — somente após resposta sobre decisão):
Reaja naturalmente se necessário, depois: "E você tem alguma viagem marcada nos próximos dias?"
PARE. Aguarde resposta.

CONDICIONAIS: Depende de parceiro → pendencia_decisor=true, GATE BLOQUEADO.
Tem viagem → seguir branch viagem, NÃO improvisar informação clínica.

GATE: gateValidator(gate_id="GATE_COMBINADO", permissao_combinado=true, combinado_confirmado=true, decisao_saude_respondida=true, viagem_respondida=true, pendencia_decisor=false)

NÃO explique o implante. NÃO fale preço. NÃO antecipe fechamento.`,

  speech: `ETAPA ATUAL: 4 de 8 — Apresentação do Protocolo
Energia: média-alta, crescendo naturalmente | Tom: especialista, segura, didática e calorosa | Ritmo: vivo, sem palestra

REGRA CENTRAL: Não despeje todo o Speech em um único turno. Use 1-2 frases por intervenção.
Observe a reação da lead entre blocos. Se trouxer dúvida/emoção, reaja primeiro.
O objetivo é evitar MONÓLOGO — não criar CHECKLIST DE PAUSAS.

ANTES DE COMEÇAR: consulte dor_principal / impacto / rotina / atividade_fisica / sintomas.

PARTE 1 — PERSONALIZAÇÃO: demonstre que lembra da pessoa. Conecte dor_principal → impacto → contexto.
Evite diagnóstico individual: ✗ "A causa raiz é..." ✓ "Quando os hormônios estão em desequilíbrio..."
parte1_entregue = true

PARTE 2 — IMPLANTE: simples e visual, até 2 frases. Pellet, grão de arroz, sob a pele, liberação contínua, protocolo individual prescrito pelo médico.
parte2_entregue = true

PARTE 3 — BENEFÍCIOS: conecte aos sintomas reais da lead.
Linguagem responsável: ✓ "o objetivo é..." / "pode ajudar..." / "há pacientes que relatam..."
parte3_entregue = true

PARTE 4 — DURAÇÃO + PERGUNTA FINAL: até 6 meses, depois é só renovar.
Somente após as 4 partes: "[Nome], o que mais te chamou atenção do que eu acabei de te apresentar?"
pergunta_final_feita = true — PARE. Aguarde resposta.

APÓS RESPOSTA: save_memory(key="interesse_protocolo", value="[resposta]")
resposta_lead_recebida = true | interesse_pos_speech = true/false

gateValidator(gate_id="GATE_SPEECH", parte1_entregue=true, parte2_entregue=true, parte3_entregue=true, parte4_entregue=true, pergunta_final_feita=true, resposta_lead_recebida=true, interesse_pos_speech=true, interesse_protocolo="[resposta]")

NÃO fale preço. NÃO fale pagamento. NÃO antecipe fechamento.`,

  fechamento: `ETAPA ATUAL: 5 de 8 — Fechamento
Energia: média-alta | Ritmo: curto | Tom: convicto, firme, sem pressão

Retome o combinado. Apresente o investimento (R$ 5.000) sem desculpas. Se objeção: OUVIR → ISOLAR → CONFIRMAR → OFERECER. Parcelamento: ATÉ 6X SEM JUROS. Quando aceite + forma de pagamento confirmados, chame gateValidator(gate_id="GATE_FECHAMENTO").`,

  pagamento: `ETAPA ATUAL: 6 de 8 — Aguardando Pagamento
Mantenha conversa leve. Verifique periodicamente. Quando confirmar pagamento, chame gateValidator(gate_id="GATE_PAGAMENTO").`,

  referidos: `ETAPA ATUAL: 7 de 8 — Indicações
Envie o link de indicações via WhatsApp. Nunca colete por voz. Aguarde completar. Chame gateValidator(gate_id="GATE_REFERIDOS") quando missaoCompleta=true.`,

  validacao: `ETAPA ATUAL: 8 de 8 — Validação Final
Verifique negativas e semDados=0. Chame gateValidator(gate_id="GATE_VALIDACAO"). O GANHO só é registrado após essa validação.`,

  ganho: `ETAPA CONCLUÍDA — Ganho confirmado! Despeça-se com calor genuíno.`,
}

// ── Estado da simulação ───────────────────────────────────────────────────────

let currentStage = 'apresentacao'
const messages = []
const gateLog = []

function systemPrompt() {
  return `${ANA_BASE_PROMPT}

INÍCIO: Você recebe a ligação e fala PRIMEIRO. Comece agora pela Etapa 1.

${STAGE_INSTRUCTIONS[currentStage]}`
}

// ── Tools simulados ───────────────────────────────────────────────────────────

const GATE_TRANSITIONS = {
  GATE_ABERTURA:   { from: 'apresentacao', to: 'conexao' },
  GATE_CONEXAO:    { from: 'conexao',      to: 'combinado' },
  GATE_COMBINADO:  { from: 'combinado',    to: 'speech' },
  GATE_SPEECH:     { from: 'speech',       to: 'fechamento' },
  GATE_FECHAMENTO: { from: 'fechamento',   to: 'pagamento' },
  GATE_PAGAMENTO:  { from: 'pagamento',    to: 'referidos' },
  GATE_REFERIDOS:  { from: 'referidos',    to: 'validacao' },
  GATE_VALIDACAO:  { from: 'validacao',    to: 'ganho' },
}

function handleGateValidator(args) {
  const { gate_id, ...evidence } = args
  const transition = GATE_TRANSITIONS[gate_id]
  if (!transition) return { approved: false, reason: `Gate desconhecido: ${gate_id}` }

  gateLog.push({ gate: gate_id, evidence, ts: new Date().toISOString() })
  currentStage = transition.to

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  🚪 GATE PASSOU: ${gate_id}`)
  console.log(`  📍 Nova etapa: ${currentStage.toUpperCase()}`)
  console.log(`  📋 Evidências: ${JSON.stringify(evidence)}`)
  console.log(`${'─'.repeat(60)}\n`)

  return {
    approved: true,
    reason: `${gate_id} aprovado.`,
    next_stage: transition.to,
    next_instructions: STAGE_INSTRUCTIONS[transition.to],
  }
}

function handleSaveMemory(args) {
  console.log(`\n  💾 MEMÓRIA SALVA: ${args.key} = "${args.value}"\n`)
  return { ok: true }
}

function handleVerificarPagamento() {
  // Em simulação, sempre retorna não pago — você pode mudar para true para testar
  return { pago: false, message: '[SIMULAÇÃO] Pagamento ainda não confirmado.' }
}

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'gateValidator',
      description: 'Valida e registra a conclusão de uma etapa, avançando para a próxima.',
      parameters: {
        type: 'object',
        properties: {
          gate_id: { type: 'string', enum: Object.keys(GATE_TRANSITIONS) },
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
  },
  {
    type: 'function',
    function: {
      name: 'save_memory',
      description: 'Salva uma informação importante sobre a lead.',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          value: { type: 'string' },
        },
        required: ['key', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'verificar_pagamento',
      description: 'Verifica se o pagamento foi confirmado.',
      parameters: { type: 'object', properties: {} },
    },
  },
]

// ── Loop de chat ──────────────────────────────────────────────────────────────

async function callAna(userMessage) {
  if (userMessage) {
    messages.push({ role: 'user', content: userMessage })
  }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt() },
      ...messages,
    ],
    tools: TOOLS,
    tool_choice: 'auto',
    temperature: 0.85,
  })

  const msg = response.choices[0].message
  messages.push(msg)

  // Processar tool calls
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    const toolResults = []
    for (const tc of msg.tool_calls) {
      const args = JSON.parse(tc.function.arguments)
      let result

      if (tc.function.name === 'gateValidator') result = handleGateValidator(args)
      else if (tc.function.name === 'save_memory') result = handleSaveMemory(args)
      else if (tc.function.name === 'verificar_pagamento') result = handleVerificarPagamento()
      else result = { ok: true }

      toolResults.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      })
    }

    messages.push(...toolResults)

    // ANA continua depois dos tools com as novas instruções de etapa
    return callAna(null)
  }

  return msg.content
}

// ── Interface de terminal ─────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

function prompt(q) {
  return new Promise(resolve => rl.question(q, resolve))
}

async function main() {
  console.clear()
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║          SIMULADOR ANA — HORMONE ECOSYSTEM               ║')
  console.log('║  Modelo: gpt-4o  |  Mesmos prompts da ligação real       ║')
  console.log('║  Digite sua resposta e pressione Enter                   ║')
  console.log('║  Ctrl+C para encerrar  |  /gates para ver gates passados ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log()

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY não encontrada. Verifique o ambiente.')
    process.exit(1)
  }

  console.log('⏳ ANA está iniciando...\n')
  const abertura = await callAna('iniciar')
  console.log(`\x1b[35mANA:\x1b[0m ${abertura}\n`)

  while (true) {
    const etapaLabel = `[Etapa: ${currentStage.toUpperCase()}]`
    const input = await prompt(`\x1b[36m${etapaLabel} Você:\x1b[0m `)

    if (input.trim() === '/gates') {
      console.log('\n📋 Gates passados:', gateLog.length === 0 ? 'nenhum ainda' : '')
      gateLog.forEach(g => console.log(`  ✓ ${g.gate} — ${g.ts}`))
      console.log()
      continue
    }

    if (input.trim() === '') continue

    process.stdout.write('\n\x1b[35mANA:\x1b[0m ')
    try {
      const reply = await callAna(input)
      console.log(reply + '\n')
    } catch (e) {
      console.error('\n❌ Erro:', e.message, '\n')
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
