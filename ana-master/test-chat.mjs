#!/usr/bin/env node
/**
 * Simulador de conversa com ANA — modo texto (sem voz, sem Twilio)
 * Usa os mesmos prompts, gates e speech progress control da ligação real.
 *
 * Uso: node test-chat.mjs
 */

import OpenAI from 'openai'
import * as readline from 'readline'
import * as fs from 'fs'
import * as path from 'path'

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

// ── Speech Progress (espelho de speech-progress.ts) ──────────────────────────

const SPEECH_PART_INSTRUCTIONS = {
  '1': `SPEECH — ENTREGUE APENAS A PARTE 1 AGORA.

Demonstre que lembra da pessoa antes de qualquer explicação.
Conecte: dor_principal → impacto → contexto de vida dela.
Use as memórias: dor_principal / impacto / rotina / atividade_fisica / sintomas.

Exemplo comportamental (NÃO fixo — adapte à lead real):
"[Nome], você me contou que sempre foi muito ativa e que hoje essa falta de energia está até atrapalhando seus treinos. Deixa eu te explicar como o equilíbrio hormonal pode entrar nessa história."

Evite diagnóstico individual categórico:
✗ "A causa raiz dos seus sintomas é..."
✓ "Quando os hormônios estão em desequilíbrio, é comum aparecerem sintomas como..."

Após concluir a Parte 1: chame registrar_parte_speech(parte=1).
PARE. Aguarde a lead reagir. O backend liberará a Parte 2 após o turno dela.`,

  '2': `SPEECH — ENTREGUE APENAS A PARTE 2 AGORA.

Explique o implante de forma simples e visual. Máximo 2 frases curtas.
- pequeno pellet, aproximadamente do tamanho de um grão de arroz
- inserido sob a pele
- liberação contínua dos hormônios
- protocolo individual prescrito pelo médico

Após concluir a Parte 2: chame registrar_parte_speech(parte=2).
PARE. Aguarde a lead reagir. O backend liberará a Parte 3 após o turno dela.`,

  '3': `SPEECH — ENTREGUE APENAS A PARTE 3 AGORA.

Relacione os benefícios aos sintomas REAIS que a lead relatou.
Use as memórias: sintomas / dor_principal / impacto.

Linguagem clinicamente responsável:
✓ "o objetivo é..." / "pode ajudar..." / "há pacientes que relatam..." / "a resposta individual é avaliada pelo médico"
✗ "Você terá..." / "Vai acontecer..." / "A causa é..."

Após concluir a Parte 3: chame registrar_parte_speech(parte=3).
PARE. Aguarde a lead reagir. O backend liberará a Parte 4 após o turno dela.`,

  '4': `SPEECH — ENTREGUE APENAS A PARTE 4 AGORA.

Explique a duração: esse protocolo pode ter duração de até 6 meses, conforme a indicação individual.

Depois faça a pergunta final obrigatória:
"[Nome], o que mais te chamou atenção do que eu acabei de te apresentar?"

Após fazer a pergunta: chame registrar_parte_speech(parte=4).
PARE. Aguarde a resposta real da lead. NÃO fale preço. NÃO antecipe fechamento.`,

  'awaiting_final': `SPEECH — AGUARDANDO RESPOSTA FINAL DA LEAD.

A lead acabou de responder à pergunta final. Processe a resposta:

Se interesse positivo (ficou empolgada, perguntou próximos passos, quer avançar):
→ save_memory(key="interesse_protocolo", value="[resposta real]")
→ chame registrar_parte_speech(parte="resposta_recebida")
→ GATE_SPEECH estará liberado

Se dúvida técnica ou clínica:
→ responda naturalmente dentro do conteúdo aprovado
→ NÃO avance até a lead demonstrar interesse claro

Se objeção:
→ siga o DNA: OUVIR → ISOLAR → CONFIRMAR → OFERECER
→ NÃO passe o gate

Se ambígua:
→ aprofunde naturalmente antes de avançar`,

  'complete': `SPEECH CONCLUÍDO. Pode chamar gateValidator(gate_id="GATE_SPEECH") agora com todas as evidências:
speech_progress_complete=true, parte1_entregue=true, parte2_entregue=true, parte3_entregue=true, parte4_entregue=true, pergunta_final_feita=true, resposta_lead_recebida=true, interesse_pos_speech=true, interesse_protocolo="[resposta da lead]"`,
}

function classifyLeadTurn(transcript, state) {
  if (!transcript || transcript.trim().length < 2) return 'UNKNOWN'
  const t = transcript.toLowerCase().trim()

  if (state === 'WAITING_FINAL_RESPONSE') return 'FINAL_INTEREST_RESPONSE'
  if (t.length < 5 && ['hã', 'oi', 'ã', 'ei'].some(w => t.includes(w))) return 'INTERRUPTION'
  if (['não entendi', 'repete', 'pode repetir', 'como assim', 'não compreendi'].some(p => t.includes(p))) return 'CONFUSION'
  if (['aham', 'entendi', 'certo', 'sim', 'pode continuar', 'tá', 'ok', 'claro', 'vai', 'uhum', 'hm'].some(p => t.includes(p))) return 'BACKCHANNEL'
  if (t.includes('?') || ['como', 'onde', 'quanto', 'quando', 'é seguro', 'dói', 'qual', 'por que'].some(p => t.includes(p))) return 'QUESTION'
  if (['não quero', 'não tenho interesse', 'não posso', 'não vou', 'deixa pra depois'].some(p => t.includes(p))) return 'OBJECTION'
  if (t.length > 10) return 'CONTINUE'
  return 'UNKNOWN'
}

// ── Persistência de sessão ────────────────────────────────────────────────────

const SESSION_FILE = path.join(process.cwd(), 'simulation-session.json')
const ANA_VERSION = 'gold-v1-speech-progress-v2'

function initialSpeechProgress() {
  return {
    parte_atual: 1,
    partes_entregues: [],
    parte_em_execucao: 1,
    parte_interrompida: false,
    state: 'DELIVERING_PART',
    waiting_for_lead: false,
    pergunta_final_feita: false,
    resposta_final_recebida: false,
  }
}

function generateSessionId() {
  return `sim-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function saveSession() {
  try {
    const now = new Date().toISOString()
    const existing = loadSessionFile()
    const lastAna = [...messages].reverse().find(m => m.role === 'assistant' && typeof m.content === 'string')
    const lastLead = [...messages].reverse().find(m => m.role === 'user')
    fs.writeFileSync(SESSION_FILE, JSON.stringify({
      session_id: existing?.session_id ?? generateSessionId(),
      ana_version: ANA_VERSION,
      created_at: existing?.created_at ?? now,
      updated_at: now,
      current_stage: currentStage,
      current_instruction: currentInstruction,
      gates_passed: gateLog,
      speech_progress: speechProgress,
      memory: Object.fromEntries(memoryStore),
      last_ana_message: lastAna?.content ?? null,
      last_lead_message: lastLead?.content ?? null,
      messages,
    }, null, 2))
  } catch (e) { console.error('⚠️  Erro ao salvar sessão:', e.message) }
}

function loadSessionFile() {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'))
  } catch { return null }
}

function resetSession() {
  try { fs.unlinkSync(SESSION_FILE) } catch { /* ignore */ }
}

// ── Estado da simulação ───────────────────────────────────────────────────────

let currentStage = 'apresentacao'
let currentInstruction = null
let messages = []
let gateLog = []
let speechProgress = initialSpeechProgress()
const memoryStore = new Map()  // tracks save_memory calls within session

function systemPrompt() {
  const stageInstruction = currentInstruction || STAGE_INSTRUCTIONS[currentStage]
  return `${ANA_BASE_PROMPT}\n\nINÍCIO: Você recebe a ligação e fala PRIMEIRO. Comece agora pela Etapa 1.\n\n${stageInstruction}`
}

// Called after user input when in speech stage
function processSpeechTurn(userInput) {
  if (currentStage !== 'speech' || !speechProgress.waiting_for_lead) return null

  const disposition = classifyLeadTurn(userInput, speechProgress.state)
  console.log(`\n  🧠 SPEECH TURN: disposition=${disposition} parte_atual=${speechProgress.parte_atual} state=${speechProgress.state}\n`)

  if (speechProgress.state === 'WAITING_FINAL_RESPONSE') {
    speechProgress.waiting_for_lead = false
    return SPEECH_PART_INSTRUCTIONS['awaiting_final']
  }

  if (speechProgress.state !== 'WAITING_LEAD') return null

  switch (disposition) {
    case 'BACKCHANNEL':
    case 'CONTINUE': {
      speechProgress.waiting_for_lead = false
      const next = String(speechProgress.parte_atual)
      if (typeof speechProgress.parte_atual === 'number') {
        speechProgress.parte_em_execucao = speechProgress.parte_atual
      }
      return SPEECH_PART_INSTRUCTIONS[next] || null
    }
    case 'QUESTION':
      // Keep waiting — ANA answers, then next turn re-classifies
      // If question is simple, ANA can continue after answering (no forced re-prompt)
      return null
    case 'INTERRUPTION':
      speechProgress.parte_interrompida = true
      return null
    default:
      return null
  }
}

// ── Gates ─────────────────────────────────────────────────────────────────────

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

const STAGE_INSTRUCTIONS = {
  apresentacao: `ETAPA ATUAL: 1 de 8 — Abertura
Energia: leve | Tom: calorosa, humana

Abra com calor e leveza. Objetivo: confirmar nome, quem indicou, e disponibilidade.
Faça isso naturalmente em no máximo 2-3 trocas. Assim que tiver as três informações confirmadas, chame gateValidator IMEDIATAMENTE com gate_id="GATE_ABERTURA" e evidências: nome_confirmado: true, referida_confirmada: true, disponibilidade_confirmada: true.
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

Exemplo comportamental (NÃO fixo — adapte ao que ela disse):
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

O Speech é entregue em 4 partes sequenciais. O backend controla qual parte está liberada.
Cada parte é liberada somente após o turno real da lead.

AGORA — ENTREGUE APENAS A PARTE 1:

Demonstre que lembra da pessoa antes de qualquer explicação.
Conecte: dor_principal → impacto → contexto de vida dela.
Use as memórias: dor_principal / impacto / rotina / atividade_fisica / sintomas.

Exemplo comportamental (NÃO fixo — adapte à lead real):
"[Nome], você me contou que sempre foi muito ativa e que hoje essa falta de energia está até atrapalhando seus treinos. Deixa eu te explicar como o equilíbrio hormonal pode entrar nessa história."

Evite diagnóstico individual categórico:
✗ "A causa raiz dos seus sintomas é..."
✓ "Quando os hormônios estão em desequilíbrio, é comum aparecerem sintomas como..."

Após concluir a Parte 1: chame registrar_parte_speech(parte=1).
PARE. Aguarde a lead reagir. O backend liberará a Parte 2 após o turno dela.
NÃO antecipe partes futuras. NÃO fale preço. NÃO antecipe fechamento.`,

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

// ── Tool handlers ─────────────────────────────────────────────────────────────

function handleGateValidator(args) {
  const { gate_id, ...evidence } = args
  const transition = GATE_TRANSITIONS[gate_id]
  if (!transition) return { approved: false, reason: `Gate desconhecido: ${gate_id}` }

  // GATE_SPEECH requires speech_progress_complete
  if (gate_id === 'GATE_SPEECH' && speechProgress.state !== 'COMPLETE') {
    return { approved: false, reason: `GATE_SPEECH bloqueado — Speech Progress incompleto. state=${speechProgress.state} parte_atual=${speechProgress.parte_atual}` }
  }

  gateLog.push({ gate: gate_id, evidence, ts: new Date().toISOString() })
  currentStage = transition.to
  currentInstruction = null

  // Arm speech progress when entering speech stage
  if (gate_id === 'GATE_COMBINADO') {
    speechProgress = { parte_atual: 1, partes_entregues: [], parte_em_execucao: 1, parte_interrompida: false, state: 'DELIVERING_PART', waiting_for_lead: false, pergunta_final_feita: false, resposta_final_recebida: false }
  }
  // Reset when leaving speech stage
  if (gate_id === 'GATE_SPEECH') {
    speechProgress = { parte_atual: 1, partes_entregues: [], parte_em_execucao: undefined, parte_interrompida: false, state: 'DELIVERING_PART', waiting_for_lead: false, pergunta_final_feita: false, resposta_final_recebida: false }
  }

  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  🚪 GATE PASSOU: ${gate_id}`)
  console.log(`  📍 Nova etapa: ${currentStage.toUpperCase()}`)
  console.log(`  📋 Evidências: ${JSON.stringify(evidence)}`)
  console.log(`${'─'.repeat(60)}\n`)

  return { approved: true, reason: `${gate_id} aprovado.`, next_stage: transition.to }
}

function handleRegistrarParteSpeech(args) {
  const { parte } = args
  const sp = speechProgress

  if (typeof parte === 'number') {
    if (parte !== sp.parte_atual) {
      return { error: `Ordem incorreta. parte_atual=${sp.parte_atual}, tentou registrar parte=${parte}. Não pule partes.` }
    }
    if (sp.parte_em_execucao !== parte) {
      return { error: `Parte ${parte} não está em execução (parte_em_execucao=${sp.parte_em_execucao}). Entregue o conteúdo da parte antes de registrar.` }
    }
    if (sp.parte_interrompida) {
      return { error: `Parte ${parte} foi interrompida — conclua o conteúdo restante antes de registrar.` }
    }
    sp.partes_entregues.push(parte)
    sp.parte_em_execucao = undefined
    sp.parte_atual = parte < 4 ? parte + 1 : 'final_question'
    sp.state = 'WAITING_LEAD'
    sp.waiting_for_lead = true

    console.log(`\n  📊 SPEECH PROGRESS: parte ${parte} registrada | próxima=${sp.parte_atual} | aguardando turno da lead\n`)
    return { ok: true, parte_registrada: parte, aguardando: 'turno_da_lead' }
  }

  if (parte === 'pergunta_feita') {
    sp.pergunta_final_feita = true
    sp.state = 'WAITING_FINAL_RESPONSE'
    sp.waiting_for_lead = true
    console.log(`\n  📊 SPEECH PROGRESS: pergunta final registrada | aguardando resposta da lead\n`)
    return { ok: true, pergunta_final: 'registrada', aguardando: 'resposta_final_da_lead' }
  }

  if (parte === 'resposta_recebida') {
    sp.resposta_final_recebida = true
    sp.parte_atual = 'complete'
    sp.state = 'COMPLETE'
    sp.waiting_for_lead = false
    currentInstruction = SPEECH_PART_INSTRUCTIONS['complete']
    console.log(`\n  📊 SPEECH PROGRESS: COMPLETO ✅ — GATE_SPEECH liberado\n`)
    return { ok: true, speech_progress: 'COMPLETE', instrucao: 'Pode chamar gateValidator GATE_SPEECH agora.' }
  }

  return { error: `parte inválida: ${parte}` }
}

function handleSaveMemory(args) {
  memoryStore.set(args.key, args.value)
  console.log(`\n  💾 MEMÓRIA SALVA: ${args.key} = "${args.value}"\n`)
  return { ok: true }
}

// ── Tools definition ──────────────────────────────────────────────────────────

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
  },
  {
    type: 'function',
    function: {
      name: 'registrar_parte_speech',
      description: 'Registra que uma parte do Speech foi concluída. SOMENTE chame depois de entregar completamente a parte. Nunca chame partes fora de ordem.',
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
]

// ── Loop de chat ──────────────────────────────────────────────────────────────

async function callAna(userMessage) {
  if (userMessage !== null) {
    // Inject speech progress instruction if needed
    if (currentStage === 'speech') {
      const nextInstruction = processSpeechTurn(userMessage)
      if (nextInstruction) {
        currentInstruction = nextInstruction
        messages.push({ role: 'system', content: `[SISTEMA — BACKEND] ${nextInstruction}` })
      }
    }
    if (userMessage !== '') {
      messages.push({ role: 'user', content: userMessage })
    }
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

  if (msg.tool_calls && msg.tool_calls.length > 0) {
    // If the model generated text AND tool_calls in the same response,
    // display the text first — it is ANA's verbal delivery before the tool fires.
    const spokenContent = msg.content?.trim()
    if (spokenContent) {
      console.log(`\x1b[35mANA:\x1b[0m ${spokenContent}\n`)
      // Mark the current part as verbalized so the guard below can confirm delivery
      if (currentStage === 'speech' && speechProgress.state === 'DELIVERING_PART') {
        speechProgress._parte_verbalizada = true
      }
    }

    const toolResults = []
    let waitingForLead = false

    for (const tc of msg.tool_calls) {
      const args = JSON.parse(tc.function.arguments)
      let result

      if (tc.function.name === 'gateValidator') result = handleGateValidator(args)
      else if (tc.function.name === 'registrar_parte_speech') {
        // Structural guard: refuse registration if no verbal delivery happened in this turn
        const parte = args.parte
        if (typeof parte === 'number' && !speechProgress._parte_verbalizada && !spokenContent) {
          result = { error: `Entrega verbal da Parte ${parte} não detectada neste turno. Verbalize o conteúdo da parte antes de registrar.` }
          console.log(`\n  ⛔ GUARD: registrar_parte_speech(${parte}) BLOQUEADO — sem conteúdo verbal neste turno.\n`)
        } else {
          result = handleRegistrarParteSpeech(args)
          speechProgress._parte_verbalizada = false  // reset for next part
          if (result.aguardando === 'turno_da_lead' || result.aguardando === 'resposta_final_da_lead') {
            waitingForLead = true
          }
        }
      }
      else if (tc.function.name === 'save_memory') result = handleSaveMemory(args)
      else result = { ok: true }

      toolResults.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) })
    }

    messages.push(...toolResults)

    // After registrar_parte_speech: ANA's turn is OVER — do NOT generate more text
    if (waitingForLead) return null

    return callAna(null)
  }

  return msg.content
}

// ── Interface de terminal ─────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
function prompt(q) { return new Promise(resolve => rl.question(q, resolve)) }

function printHeader() {
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║           SIMULADOR ANA — HORMONE ECOSYSTEM                 ║')
  console.log('║  Modelo: gpt-4o  |  Speech Progress Control ativo           ║')
  console.log('║  /gates /speech /memory /reset /save  |  Ctrl+C encerra     ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
}

async function selectMode() {
  const saved = loadSessionFile()

  if (!saved) {
    console.log('\n▶  Nenhuma sessão salva encontrada. Iniciando nova simulação.\n')
    return 'new'
  }

  const age = Math.round((Date.now() - new Date(saved.updated_at).getTime()) / 60000)
  const ageStr = age < 60 ? `${age}min atrás` : `${Math.round(age/60)}h atrás`

  console.log(`\n📁 Sessão salva encontrada:`)
  console.log(`   ID:      ${saved.session_id}`)
  console.log(`   Etapa:   ${saved.current_stage.toUpperCase()}`)
  console.log(`   Gates:   ${saved.gates_passed?.length ?? 0} passados`)
  console.log(`   Versão:  ${saved.ana_version}`)
  console.log(`   Salva:   ${ageStr}`)
  if (saved.last_lead_message) console.log(`   Última lead: "${saved.last_lead_message.slice(0, 60)}..."`)
  console.log()
  console.log('  [1] Continuar de onde parou')
  console.log('  [2] Nova simulação (mantém arquivo anterior)')
  console.log('  [3] Resetar e começar do zero')
  console.log()

  while (true) {
    const choice = await prompt('Escolha [1/2/3]: ')
    if (choice.trim() === '1') return 'continue'
    if (choice.trim() === '2') return 'new'
    if (choice.trim() === '3') return 'reset'
    console.log('  Digite 1, 2 ou 3.')
  }
}

async function main() {
  console.clear()
  printHeader()

  if (!process.env.OPENAI_API_KEY) {
    console.error('\n❌ OPENAI_API_KEY não encontrada.')
    process.exit(1)
  }

  const mode = await selectMode()

  if (mode === 'reset') {
    resetSession()
    console.log('\n🗑️  Sessão resetada. Iniciando nova simulação.\n')
  }

  if (mode === 'continue') {
    const saved = loadSessionFile()
    currentStage = saved.current_stage
    currentInstruction = saved.current_instruction ?? null
    messages = saved.messages ?? []
    gateLog = saved.gates_passed ?? []
    speechProgress = saved.speech_progress ?? initialSpeechProgress()
    if (saved.memory) {
      for (const [k, v] of Object.entries(saved.memory)) memoryStore.set(k, v)
    }

    console.log(`\n✅ Sessão restaurada — etapa: ${currentStage.toUpperCase()}`)
    console.log(`   Gates passados: ${gateLog.map(g => g.gate).join(', ') || 'nenhum'}`)
    if (currentStage === 'speech') {
      console.log(`   Speech Progress: P${speechProgress.parte_atual} | ${speechProgress.state}`)
    }

    // Show last exchange so user remembers context
    const lastAna = [...messages].reverse().find(m => m.role === 'assistant' && typeof m.content === 'string')
    if (lastAna) {
      console.log(`\n--- Última fala da ANA ---`)
      console.log(`\x1b[35mANA:\x1b[0m ${lastAna.content}`)
      console.log(`--- Retomando aqui ---\n`)
    }
  } else {
    // New simulation
    console.log('\n⏳ ANA está iniciando...\n')
    const abertura = await callAna('')
    console.log(`\x1b[35mANA:\x1b[0m ${abertura}\n`)
    saveSession()
  }

  while (true) {
    const speechInfo = currentStage === 'speech'
      ? ` | Speech P${speechProgress.parte_atual} ${speechProgress.state}`
      : ''
    const label = `[${currentStage.toUpperCase()}${speechInfo}]`
    const input = await prompt(`\x1b[36m${label} Você:\x1b[0m `)

    if (input.trim() === '/gates') {
      console.log('\n📋 Gates passados:', gateLog.length === 0 ? 'nenhum ainda' : '')
      gateLog.forEach(g => console.log(`  ✓ ${g.gate} — ${g.ts}`))
      console.log()
      continue
    }

    if (input.trim() === '/speech') {
      console.log('\n📊 Speech Progress:', JSON.stringify(speechProgress, null, 2))
      console.log()
      continue
    }

    if (input.trim() === '/memory') {
      console.log('\n🧠 Memórias salvas:')
      if (memoryStore.size === 0) console.log('  (nenhuma)')
      memoryStore.forEach((v, k) => console.log(`  ${k}: "${v}"`))
      console.log()
      continue
    }

    if (input.trim() === '/reset') {
      resetSession()
      console.log('\n🗑️  Sessão apagada. Reiniciando...\n')
      process.exit(0)
    }

    if (input.trim() === '/save') {
      saveSession()
      console.log('\n💾 Sessão salva manualmente.\n')
      continue
    }

    if (input.trim() === '/status') {
      const saved = loadSessionFile()
      if (saved) {
        console.log(`\n📋 Sessão: ${saved.session_id} | ${saved.ana_version}`)
        console.log(`   Etapa: ${currentStage} | Messages: ${messages.length}`)
      }
      console.log()
      continue
    }

    if (input.trim() === '') continue

    process.stdout.write('\n\x1b[35mANA:\x1b[0m ')
    try {
      const reply = await callAna(input)
      if (reply) console.log(reply + '\n')
      saveSession()
    } catch (e) {
      console.error('\n❌ Erro:', e.message, '\n')
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
