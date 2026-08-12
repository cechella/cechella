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
import { createHash } from 'crypto'
// Canonical source of truth for gate transitions — same definition used by production server
import { ANA_BASE_PROMPT as _ANA_BASE_PROMPT, GATE_TRANSITIONS as _GATE_TRANSITIONS } from './dist/state-machine.js'

// ── Stale dist guard ──────────────────────────────────────────────────────────
// Verifies that dist/state-machine.js is in sync with src/state-machine.ts.
// If src was modified after dist, the simulator would use an outdated definition.
function checkDistFreshness() {
  try {
    const srcPath  = new URL('./src/state-machine.ts', import.meta.url).pathname
    const distPath = new URL('./dist/state-machine.js', import.meta.url).pathname
    const srcStat  = fs.statSync(srcPath)
    const distStat = fs.statSync(distPath)
    if (srcStat.mtimeMs > distStat.mtimeMs) {
      console.error('\n⚠️  AVISO: src/state-machine.ts foi modificado após o último build.')
      console.error('   O simulador pode estar usando GATE_TRANSITIONS desatualizado.')
      console.error('   Execute: npm run build\n')
      process.exit(1)
    }
    // Also verify GATE_TRANSITIONS hash matches expected shape
    const keys = Object.keys(_GATE_TRANSITIONS).sort().join(',')
    const hash = createHash('sha256').update(keys).digest('hex').slice(0, 8)
    console.log(`  ✓ GATE_TRANSITIONS carregado do dist/ [gates=${Object.keys(_GATE_TRANSITIONS).length} hash=${hash}]`)
  } catch (e) {
    console.error('  ⚠️  Não foi possível verificar dist freshness:', e.message)
  }
}
checkDistFreshness()

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── Prompts — fonte única: dist/state-machine.js ─────────────────────────────
// ANA_BASE_PROMPT é importado do state-machine compilado.
// Para alterar o prompt base: edite src/state-machine.ts → npm run build.
// O espelhamento para voz (realtime.ts) é automático — mesma fonte.
const ANA_BASE_PROMPT = _ANA_BASE_PROMPT

// ── Speech Progress (espelho de speech-progress.ts) ──────────────────────────

const SPEECH_PART_INSTRUCTIONS = {
  '1': `SPEECH — PARTE 1: PERSONALIZAÇÃO + PONTE. Máximo 2 frases.

Use SOMENTE o que está na memória desta sessão: dor_principal, impacto, sintomas.
NÃO use exemplos do treinamento como se fossem dados da lead.
NÃO invente sintomas que a lead não relatou (ex: "falta de energia", "treinos" se não foram mencionados).

Frase 1: "[Nome], você me contou que [dor_principal real da memória]."
Frase 2: "Quando os hormônios estão em desequilíbrio, é comum aparecerem sintomas como os que você mencionou."

PROIBIDO nesta parte:
✗ pellet, grão de arroz, inserção, liberação contínua
✗ duração, 6 meses, prazo de resultado
✗ benefícios específicos, proteção cardiovascular, óssea
✗ qualquer dado que não veio da memória desta lead

Após as 2 frases: chame registrar_parte_speech(parte=1) silenciosamente e encerre o turno.
NÃO diga nada mais. NÃO verbalize o registro.`,

  '2': `SPEECH — PARTE 2: O QUE É O IMPLANTE. Só isso, 2 frases.

"O implante hormonal é um pequeno pellet, aproximadamente do tamanho de um grão de arroz, que é inserido sob a pele. Ele libera os hormônios de forma contínua, de acordo com um protocolo individual prescrito pelo médico."

FIM. Não acrescente nada. Não diga "garantindo equilíbrio", não faça perguntas.

Após as 2 frases: chame registrar_parte_speech(parte=2) silenciosamente e encerre o turno.
ZERO fala adicional. Não diga "faz sentido?", "entendeu?", "alguma dúvida?", "posso continuar?". A lead fala quando quiser.`,

  '3': `SPEECH — PARTE 3: BENEFÍCIOS CONECTADOS AOS SINTOMAS REAIS. Só isso.

Use SOMENTE os sintomas que estão na memória (sintomas / dor_principal / impacto).
NÃO introduza benefícios que a lead não relatou — se ela não mencionou energia, não fale de energia.

Linguagem responsável:
✓ "o objetivo é ajudar em sintomas como..." / "pode contribuir para..." / "a resposta é individual e acompanhada pelo médico"
✗ "Você terá..." / "vai acontecer..." / "garante..." / "cura..."

FIM após os benefícios conectados. Não diga mais nada.

Após o conteúdo: chame registrar_parte_speech(parte=3) silenciosamente e encerre o turno.
SILÊNCIO ABSOLUTO. PROIBIDO: "Como você se sente?", "faz sentido?", "alguma dúvida?", "o que acha?", "posso continuar?", "está entendendo?". A lead reage quando quiser.`,

  '4': `SPEECH — PARTE 4: DURAÇÃO. Só isso, uma frase.

"Esse protocolo pode ter duração de até 6 meses, conforme a indicação individual feita pelo médico."

Após essa frase: chame registrar_parte_speech(parte=4) silenciosamente.
NÃO faça a pergunta final agora. NÃO diga mais nada. O sistema injeta a instrução seguinte automaticamente.`,

  'final_question': `SPEECH — PERGUNTA FINAL GOLD. Apenas isso.

Faça SOMENTE esta pergunta, exatamente uma vez, adaptando o nome:
"[Nome], o que mais te chamou atenção do que eu acabei de te apresentar?"

Após fazer a pergunta: chame registrar_parte_speech(parte='pergunta_feita') silenciosamente.
SILÊNCIO ABSOLUTO após o registro. Aguarde a resposta real da lead. NÃO fale preço. NÃO antecipe fechamento.`,

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
// memoryStore: Map<key, { value: string, source: 'lead_explicit'|'model_inferred'|'backend_fact'|'system_config', raw_evidence?: string, created_stage?: string }>
const memoryStore = new Map()

function getMemoryValue(key) {
  const entry = memoryStore.get(key)
  return entry ? entry.value : undefined
}

function getMemorySource(key) {
  const entry = memoryStore.get(key)
  return entry ? entry.source : undefined
}
let autoRegisterCount = 0

// ── QA Metrics ───────────────────────────────────────────────────────────────
const qaMetrics = {
  p1_first_pass_success: 0,
  p1_retry_count: 0,
  p1_attempt_count: 0,
  guard_trigger_count: 0,
  tool_missing_count: 0,
  auto_register_count: 0,
  memory_violation_count: 0,
  scope_violation_count: 0,
  trailing_text_count: 0,
  fechamento_promise_violations: 0,
  fechamento_memory_violations: 0,
}

function countSentences(text) {
  if (!text) return 0
  const parts = text.match(/[^.!?]+[.!?]+/g) || []
  // If no punctuation found at all, treat the whole block as 1 sentence
  return parts.length || (text.trim().length > 0 ? 1 : 0)
}

// Invariantes estruturais — sempre bloqueiam progressão
const P1_STRUCTURAL_VIOLATIONS = [
  // Conteúdo clínico/comercial indevido (pertence a P2/P3/P4)
  { pattern: 'pellet',                  reason: 'conteúdo_p2_antecipado="pellet"' },
  { pattern: 'grão de arroz',           reason: 'conteúdo_p2_antecipado="grão de arroz"' },
  { pattern: 'inserção',                reason: 'conteúdo_p2_antecipado="inserção"' },
  { pattern: 'liberação contínua',      reason: 'conteúdo_p2_antecipado="liberação contínua"' },
  { pattern: '6 meses',                 reason: 'conteúdo_p4_antecipado="6 meses"' },
  { pattern: 'proteção cardiovascular', reason: 'conteúdo_p3_antecipado="proteção cardiovascular"' },
  { pattern: 'proteção óssea',          reason: 'conteúdo_p3_antecipado="proteção óssea"' },
  // Revelar infraestrutura interna
  { pattern: 'parte 1',   reason: 'revelou_infra="parte 1"' },
  { pattern: 'parte 2',   reason: 'revelou_infra="parte 2"' },
  { pattern: 'vou registrar', reason: 'revelou_infra="vou registrar"' },
  { pattern: 'vou salvar',    reason: 'revelou_infra="vou salvar"' },
  { pattern: 'próxima parte', reason: 'revelou_infra="próxima parte"' },
]

// Desvios de expressão — QA registra, conversa não é bloqueada
const P1_EXPRESSION_DEVIATIONS = [
  { pattern: 'vou explicar',   label: 'trailing_transition' },
  { pattern: 'vou te contar',  label: 'trailing_transition' },
  { pattern: 'agora vou',      label: 'trailing_transition' },
  { pattern: 'vou te mostrar', label: 'trailing_transition' },
  { pattern: 'deixa eu te',    label: 'trailing_transition' },
  { pattern: 'já continuo',    label: 'trailing_transition' },
]

// Fechamento QA — verifica violações de memória e promessas absolutas
function validateFechamentoContent(content) {
  const violations = []
  const text = content.toLowerCase()

  // Promessas absolutas — proibidas
  const absoluteClaims = [
    { pattern: 'acabar com',        label: 'fechamento_promise_violation="acabar com"' },
    { pattern: 'resolve de uma vez',label: 'fechamento_promise_violation="resolve de uma vez"' },
    { pattern: 'elimina ',          label: 'fechamento_promise_violation="elimina"' },
    { pattern: 'cura ',             label: 'fechamento_promise_violation="cura"' },
  ]
  for (const c of absoluteClaims) {
    if (text.includes(c.pattern)) violations.push(c.label)
  }

  // Memória inventada — benefícios que a lead não mencionou
  // Only lead_explicit memories authorize strong attribution in comercial speech
  const interesseSource = getMemorySource('interesse_protocolo')
  const dorSource = getMemorySource('dor_principal')
  const memorizedInteresse = (interesseSource === 'lead_explicit' ? getMemoryValue('interesse_protocolo') || '' : '').toLowerCase()
  const memorizedDor = (dorSource === 'lead_explicit' ? getMemoryValue('dor_principal') || '' : '').toLowerCase()
  const authorizedText = memorizedInteresse + ' ' + memorizedDor

  const forbiddenIfNotMentioned = [
    { token: 'energia',   label: 'fechamento_memory_violation="energia de volta" — lead não mencionou energia' },
    { token: 'libido',    label: 'fechamento_memory_violation="libido" — lead não mencionou libido' },
    { token: 'treino',    label: 'fechamento_memory_violation="treino" — lead não mencionou treino' },
    { token: 'humor',     label: 'fechamento_memory_violation="humor" — lead não mencionou humor' },
  ]
  for (const f of forbiddenIfNotMentioned) {
    if (text.includes(f.token) && !authorizedText.includes(f.token)) {
      violations.push(f.label)
    }
  }

  return violations
}

// Returns { blocking: string[], warnings: string[] }
function validateP1Content(content) {
  const blocking = []
  const warnings = []
  const text = content.toLowerCase()

  // Sentence count — warning only, not a block
  const sentenceCount = countSentences(content)
  if (sentenceCount > 2) {
    warnings.push(`sentence_count=${sentenceCount} (desejado=2)`)
    qaMetrics.trailing_text_count++
  }

  // Structural violations — block
  for (const { pattern, reason } of P1_STRUCTURAL_VIOLATIONS) {
    if (text.includes(pattern)) {
      blocking.push(reason)
      qaMetrics.scope_violation_count++
    }
  }

  // Expression deviations — warn only
  for (const { pattern, label } of P1_EXPRESSION_DEVIATIONS) {
    if (text.includes(pattern)) {
      warnings.push(`${label}="${pattern}"`)
      qaMetrics.trailing_text_count++
    }
  }

  // Memory violations — always block (inventing lead facts)
  const authorizedDor = (getMemoryValue('dor_principal') || '').toLowerCase()
  const authorizedImpacto = (getMemoryValue('impacto') || '').toLowerCase()
  const authorizedSintomas = (getMemoryValue('sintomas') || '').toLowerCase()
  const authorizedText = `${authorizedDor} ${authorizedImpacto} ${authorizedSintomas}`

  const knownFakeData = ['falta de energia', 'atrapalhando seus treinos', 'sempre foi muito ativa']
  for (const fake of knownFakeData) {
    if (text.includes(fake) && !authorizedText.includes(fake)) {
      blocking.push(`dado_inventado="${fake}"`)
      qaMetrics.memory_violation_count++
    }
  }

  return { blocking, warnings }
}

function buildSpeechP1Instruction() {
  const dor = getMemoryValue('dor_principal') || '(não registrado)'
  const impacto = getMemoryValue('impacto') || '(não registrado)'
  const sintomas = getMemoryValue('sintomas') || '(não registrado)'
  return `SPEECH — PARTE 1: PERSONALIZAÇÃO + PONTE.

ORÇAMENTO: EXATAMENTE 2 FRASES. Nada antes. Nada depois.

DADOS AUTORIZADOS DESTA LEAD (use SOMENTE estes):
  dor_principal: "${dor}"
  impacto: "${impacto}"
  sintomas: "${sintomas}"

QUALQUER dado não listado acima não pode ser atribuído a esta lead.

SAÍDA OBRIGATÓRIA — escreva exatamente estas 2 frases adaptando os colchetes:
  Frase 1: "[Nome], você me contou que [use dor_principal ou impacto acima, palavra por palavra]."
  Frase 2: "Quando os hormônios estão em desequilíbrio, é comum aparecerem sintomas como os que você mencionou."

APÓS A FRASE 2: chame registrar_parte_speech(parte=1) e PARE COMPLETAMENTE.
NÃO escreva uma terceira frase. NÃO escreva nenhuma transição. NÃO escreva nada mais.
Exemplos do que NÃO escrever após a frase 2:
✗ "Vou explicar como podemos ajudar."
✗ "Deixa eu te contar mais."
✗ "Agora vou te mostrar..."
✗ "Na próxima parte..."
✗ qualquer outra frase de qualquer tipo

PROIBIDO no conteúdo:
✗ pellet, grão de arroz, inserção, liberação contínua
✗ duração, 6 meses, prazo de resultado
✗ benefícios específicos, proteção cardiovascular, óssea
✗ qualquer dado que não veio dos DADOS AUTORIZADOS acima`
}

function buildFechamentoInstruction() {
  const interesse = getMemoryValue('interesse_protocolo') || '[interesse não registrado]'
  const dor = getMemoryValue('dor_principal') || '[dor não registrada]'

  return `ETAPA ATUAL: 5 de 8 — Fechamento
Energia: média-alta | Ritmo: curto | Tom: convicto, firme, sem pressão

PASSO 1 — VALIDAR (1-2 frases)
Reconheça o que ela disse que mais gostou: "${interesse}"
Use exatamente isso — não invente benefício que ela não mencionou.

PASSO 2 — INVOCAR O COMBINADO E APRESENTAR VALOR
Diga: "[Nome], lembra do nosso combinado? Você disse que se gostasse do que ouvisse me daria um sim."
Diga: "O investimento no seu implante hormonal é de ${COMERCIAL_CONFIG.investimento_fmt}. Isso inclui o procedimento completo, acompanhamento e os 6 meses de hormônio liberado de forma contínua no seu corpo."
Diga: "Colocando na conta, são menos de oitocentos e cinquenta reais por mês dentro de um protocolo voltado justamente para o que você quer melhorar: [use SOMENTE o que está em interesse_protocolo = "${interesse}" — não acrescente benefícios que a lead não mencionou]."

PASSO 3 — APRESENTAR FORMAS DE PAGAMENTO
Diga: "Para avançar temos duas formas: ${COMERCIAL_CONFIG.pix_descricao} ou ${COMERCIAL_CONFIG.cartao_descricao}. Qual funciona melhor para você, [nome]?"
PARE. WAITING_LEAD. Não continue sem resposta.

PASSO 4 — QUANDO LEAD ESCOLHER:
• Escolheu PIX ou cartão → salve método com save_memory(key="forma_pagamento_escolhida", value="pix" ou "cartao") → chame gateValidator(gate_id="GATE_FECHAMENTO", investimento_apresentado=true, forma_pagamento_escolhida="pix"/"cartao", parcelamento_6x_mencionado=true)
• Objeção → veja técnica ISOLA no prompt base → tente ao menos 3 vezes → NÃO chame GATE_FECHAMENTO enquanto objeção ativa

INVARIANTE: "quero seguir" ≠ pagamento escolhido.
GATE_FECHAMENTO exige: investimento_apresentado=true + forma_pagamento_escolhida + parcelamento_6x_mencionado=true
NUNCA mencione 12x. NUNCA invente valor diferente de ${COMERCIAL_CONFIG.investimento_fmt}.`
}

function systemPrompt() {
  let stageInstruction = currentInstruction || STAGE_INSTRUCTIONS[currentStage]
  // For Speech Part 1, always interpolate real memory values into the instruction
  if (currentStage === 'speech' && speechProgress.state === 'DELIVERING_PART' && speechProgress.parte_atual === 1 && !currentInstruction) {
    stageInstruction = buildSpeechP1Instruction()
  }
  // For Fechamento, always use interpolated instruction with real memory
  if (currentStage === 'fechamento' && !currentInstruction) {
    stageInstruction = buildFechamentoInstruction()
  }
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
      // Part 1 always uses interpolated real memory values
      if (next === '1') return buildSpeechP1Instruction()
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

// ── Dados comerciais — fonte estruturada (não hardcodar em prompts) ──────────
const COMERCIAL_CONFIG = {
  investimento_fmt: 'R$ 5.000',
  pix_descricao: 'PIX à vista',
  cartao_descricao: 'cartão em até 6x sem juros',
}

// ── Gates — fonte única: dist/state-machine.js (mesma definição do servidor) ──
const GATE_TRANSITIONS = _GATE_TRANSITIONS

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

AGORA — ENTREGUE APENAS A PARTE 1. Instrução detalhada será injetada pelo backend com os dados reais desta lead.`,

  fechamento: null, // built dynamically via buildFechamentoInstruction()

  pagamento: `ETAPA ATUAL: 6 de 8 — Aguardando Pagamento
Energia: calma | Tom: acolhedora, presente, sem pressão

O link já foi enviado no WhatsApp dela. Mantenha a lead no telefone com conversa leve e acolhedora.
NUNCA diga "vou passar para a equipe" — o link já foi enviado automaticamente.
NUNCA avance de etapa manualmente — o backend avança quando o pagamento confirmar via gateValidator.

RESPOSTAS POR SITUAÇÃO:
• Lead diz que pagou: aguarde — o backend verifica. Diga: "Ótimo! Deixa eu confirmar aqui..." Quando confirmado, chame gateValidator(gate_id="GATE_PAGAMENTO", telefone="[número da lead]").
• Lead pede reenvio: "Já enviei sim! Pode verificar no WhatsApp — às vezes demora alguns segundinhos. Tenta puxar a tela para baixo para atualizar."
• Lead pede novo PIX: "Certo, vou gerar um novo código para você agora." [aguarde instrução do backend]
• Lead desiste: "[Nome], entendo. Sem pressão. Se mudar de ideia, estou aqui." [aplique objeções se couber]

PROIBIDO confirmar pagamento recebido sem que gateValidator(GATE_PAGAMENTO) seja chamado e aprovado.`,

  referidos: `ETAPA ATUAL: 7 de 8 — Indicações
Energia: entusiasmada, leve | Tom: parceira, celebrando

Pagamento confirmado. Agora conduza a lead a enviar os contatos das amigas.
O link é o ÚNICO canal — NUNCA colete contatos por voz.

PASSO 1 — CELEBRAR E PEDIR O FAVOR:
"[Nome], seu pagamento foi confirmado! Posso te pedir um favor? Você acabou de tomar uma das melhores decisões da sua saúde. Tenho certeza que você conhece outras mulheres passando pelo mesmo que você passou. Acabei de te mandar o link no WhatsApp. Pode abrir agora?"

PASSO 2 — GUIAR NO LINK (após ela confirmar que abriu):
"No link você vai ver um botão escrito Abrir WhatsApp. Toca nele." [aguarde confirmar]
"Vai aparecer uma conversa com um código para enviar. Manda esse código para mim no WhatsApp — é só um toque!" [aguarde confirmar que enviou]

PASSO 3 — APÓS ELA ENVIAR O TOKEN:
"Perfeito! Um vídeo tutorial acabou de chegar no seu WhatsApp. Assiste rapidinho — ele mostra exatamente como compartilhar os contatos. Me fala quando terminar!"
[aguarde] → "Agora é só voltar para o link e tocar em Enviar para cada amiga — ou enviar para todas de uma vez!"

ACOMPANHAMENTO A CADA 2 MINUTOS (enquanto aguarda progresso):
• Se total = 0: "Conseguiu abrir o link? É só tocar em Abrir WhatsApp — vai aparecer um código para enviar para mim."
• Se total > 0 e faltam > 0: "Ótimo! Vi que você já tem [total] amigas — faltam só [faltam]! Continua, você tá indo super bem!"
• Se total >= 20 e semDados > 0: "Perfeito! Agora no link aparece que [semDados] amigas ainda precisam de profissão e hobby preenchidos. Consegue preencher rapidinho?"
• Se página não atualizar: "Puxa a tela de cima para baixo para recarregar. Fico aqui com você."

QUANDO missaoCompleta = true (20 contatos + todos com dados):
→ chame gateValidator(gate_id="GATE_REFERIDOS", token_indicacao="[token]")

NUNCA ofereça coletar contatos por voz. O link é o único canal.`,

  validacao: `ETAPA ATUAL: 8 de 8 — Validação Final e Encerramento
Energia: calorosa, celebração genuína | Tom: parceira, humana

Verifique se alguma indicada recusou receber contato e confirme que todas têm dados preenchidos (semDados=0).
Quando tudo validado: chame gateValidator(gate_id="GATE_VALIDACAO", negativas_verificadas=true).
O GANHO só é registrado pelo servidor após essa validação — nunca antes.

APÓS GATE_VALIDACAO APROVADO — ENCERRAMENTO:
"Foi um prazer conversar com você, [nome]! Você é incrível — fez tudo certinho!"
"Nossa equipe já está com todos os dados das suas amigas e vai entrar em contato com cada uma delas. Qualquer dúvida, estou aqui."
"Até logo!"
Se lead agradecer: "De nada. Você fez uma escolha incrível pela sua saúde. Cuida bem!"`,

  ganho: `ETAPA CONCLUÍDA — Ganho confirmado. A mensagem de boas-vindas já foi enviada pelo sistema. Despeça-se com calor genuíno se ainda estiver na ligação.`,
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

function handleGateValidator(args) {
  const { gate_id, ...evidence } = args
  const transition = GATE_TRANSITIONS[gate_id]
  if (!transition) return { approved: false, reason: `Gate desconhecido: ${gate_id}` }

  // INVARIANTE: cada gate só pode ser avaliado a partir do stage de origem correto
  if (currentStage !== transition.from) {
    const reason = `${gate_id} bloqueado — stage atual é "${currentStage}", mas este gate exige "${transition.from}". Salto de etapa é impossível.`
    console.log(`\n  🚫 [GATE BLOQUEADO] ${reason}\n`)
    return { approved: false, reason }
  }

  // GATE_SPEECH requer SpeechProgress completo
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
  // Reset speech progress and arm fechamento instruction
  if (gate_id === 'GATE_SPEECH') {
    speechProgress = { parte_atual: 1, partes_entregues: [], parte_em_execucao: undefined, parte_interrompida: false, state: 'DELIVERING_PART', waiting_for_lead: false, pergunta_final_feita: false, resposta_final_recebida: false }
    currentInstruction = buildFechamentoInstruction()
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

    if (parte < 4) {
      sp.parte_atual = parte + 1
      sp.state = 'WAITING_LEAD'
      sp.waiting_for_lead = true
      console.log(`\n  📊 SPEECH PROGRESS: parte ${parte} registrada | próxima=${sp.parte_atual} | aguardando turno da lead\n`)
      return { ok: true, parte_registrada: parte, aguardando: 'turno_da_lead' }
    } else {
      // Part 4: inject final_question instruction immediately, no lead turn needed
      sp.parte_atual = 'final_question'
      sp.state = 'WAITING_LEAD'
      sp.waiting_for_lead = false
      currentInstruction = SPEECH_PART_INSTRUCTIONS['final_question']
      console.log(`\n  📊 SPEECH PROGRESS: parte 4 registrada | pergunta final a ser feita\n`)
      return { ok: true, parte_registrada: 4, proximo: 'pergunta_final' }
    }
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
  const source = args.source || 'model_inferred'
  const entry = { value: args.value, source, raw_evidence: args.raw_evidence, created_stage: currentStage }
  memoryStore.set(args.key, entry)
  console.log(`\n  💾 MEMÓRIA SALVA: ${args.key} = "${args.value}" [source=${source}]\n`)
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
  },
  {
    type: 'function',
    function: {
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
    }

    const toolResults = []
    let waitingForLead = false

    for (const tc of msg.tool_calls) {
      const args = JSON.parse(tc.function.arguments)
      let result

      if (tc.function.name === 'gateValidator') result = handleGateValidator(args)
      else if (tc.function.name === 'registrar_parte_speech') {
        const parte = args.parte
        const isNumericPart = typeof parte === 'number'
        const hasVerbalContent = !!spokenContent

        // GUARD 1: registration without verbal content in same turn
        if (isNumericPart && !hasVerbalContent) {
          qaMetrics.guard_trigger_count++
          console.log(`  ⚠️  [QA] speech_content_missing: parte ${parte} — sem conteúdo verbal neste turno`)
          result = {
            error: `Conteúdo não verbalizado. Fale o conteúdo da Parte ${parte} antes de registrar. Entregue as frases agora e chame registrar_parte_speech após.`,
          }
        }
        // GUARD 2: P1 content validation
        else if (isNumericPart && parte === 1 && hasVerbalContent) {
          qaMetrics.p1_attempt_count++
          const { blocking, warnings } = validateP1Content(spokenContent)
          if (warnings.length > 0) {
            console.log(`  ⚠️  [QA] P1_EXPRESSION_DEVIATION (conversa continua):`)
            warnings.forEach(w => console.log(`     • ${w}`))
          }
          if (blocking.length > 0) {
            qaMetrics.guard_trigger_count++
            qaMetrics.p1_retry_count++
            console.log(`\n  ❌ [QA] P1_STRUCTURAL_VIOLATION — NÃO registrada, NÃO avança`)
            blocking.forEach(r => console.log(`     • ${r}`))
            console.log()
            result = {
              error: `P1_STRUCTURAL_VIOLATION: ${blocking.join('; ')}. Reescreva P1 usando SOMENTE dados da memória autorizada, sem conteúdo de P2/P3/P4, sem revelar infraestrutura interna.`,
            }
          } else {
            if (qaMetrics.p1_retry_count === 0) qaMetrics.p1_first_pass_success++
            const label = qaMetrics.p1_retry_count === 0 ? 'GOLD' : 'RECOVERED'
            console.log(`  ✅ [QA] P1_VALID — ${label}${warnings.length > 0 ? ' (com desvios de expressão)' : ''}`)
            result = handleRegistrarParteSpeech(args)
            if (result.aguardando === 'turno_da_lead' || result.aguardando === 'resposta_final_da_lead') {
              waitingForLead = true
            }
          }
        }
        else {
          result = handleRegistrarParteSpeech(args)
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

  // Deterministic registration: if model generated content in DELIVERING_PART
  // without calling registrar_parte_speech, inject it automatically (simulator only).
  const explicitRegistrarCalled = (msg.tool_calls || []).some(
    tc => tc.function?.name === 'registrar_parte_speech'
  )
  const parte = speechProgress.parte_atual
  const autoRegisterEligible =
    currentStage === 'speech' &&
    speechProgress.state === 'DELIVERING_PART' &&                          // guard 1
    speechProgress.parte_em_execucao === speechProgress.parte_atual &&     // guard 2
    typeof parte === 'number' &&
    !!msg.content?.trim() &&                                               // guard 3
    !explicitRegistrarCalled &&                                            // guard 4
    !speechProgress.parte_interrompida &&                                  // guard 5
    !speechProgress.partes_entregues.includes(parte)                       // guard 6

  if (autoRegisterEligible) {
    const autoContent = msg.content?.trim() || ''

    // P1 QA validation before auto-registering
    if (parte === 1) {
      qaMetrics.p1_attempt_count++
      const { blocking, warnings } = validateP1Content(autoContent)
      if (warnings.length > 0) {
        console.log(`  ⚠️  [QA] P1_EXPRESSION_DEVIATION (conversa continua):`)
        warnings.forEach(w => console.log(`     • ${w}`))
      }
      if (blocking.length > 0) {
        qaMetrics.guard_trigger_count++
        qaMetrics.p1_retry_count++
        console.log(`\n  ❌ [QA] P1_STRUCTURAL_VIOLATION (auto-registro bloqueado)`)
        blocking.forEach(r => console.log(`     • ${r}`))
        console.log(`     → P1 NÃO registrada. SpeechProgress NÃO avança.\n`)
        const blockId = `auto_block_${Date.now()}`
        messages.pop()
        messages.push({
          ...msg,
          tool_calls: [{ id: blockId, type: 'function', function: { name: 'registrar_parte_speech', arguments: JSON.stringify({ parte }) } }],
        })
        messages.push({
          role: 'tool', tool_call_id: blockId,
          content: JSON.stringify({ error: `P1_STRUCTURAL_VIOLATION: ${blocking.join('; ')}. Reescreva P1 usando SOMENTE dados da memória autorizada, sem conteúdo de P2/P3/P4, sem revelar infraestrutura.` }),
        })
        return callAna(null)
      }
      if (qaMetrics.p1_retry_count === 0) qaMetrics.p1_first_pass_success++
      const label = qaMetrics.p1_retry_count === 0 ? 'GOLD' : 'RECOVERED'
      console.log(`  ✅ [QA] P1_VALID — ${label}${warnings.length > 0 ? ' (com desvios de expressão)' : ''}`)
    }

    qaMetrics.auto_register_count++
    const fakeId = `auto_${Date.now()}`
    messages.pop()
    messages.push({
      ...msg,
      tool_calls: [{
        id: fakeId,
        type: 'function',
        function: { name: 'registrar_parte_speech', arguments: JSON.stringify({ parte }) },
      }],
    })
    const result = handleRegistrarParteSpeech({ parte })
    messages.push({ role: 'tool', tool_call_id: fakeId, content: JSON.stringify(result) })
    console.log(`\n  🤖 AUTO-REGISTRO: registrar_parte_speech(${parte}) [total: ${qaMetrics.auto_register_count}]\n`)
    if (result.aguardando === 'turno_da_lead') return null
    return callAna(null)  // parte 4 → injeta final_question
  }

  // Model verbalized speech content without calling tool and guards failed → log, safe state
  if (
    currentStage === 'speech' &&
    speechProgress.state === 'DELIVERING_PART' &&
    msg.content?.trim() &&
    !explicitRegistrarCalled
  ) {
    qaMetrics.tool_missing_count++
    console.log(`  ⚠️  [QA] speech_tool_missing: parte ${parte} verbalizada sem registrar_parte_speech (guards não atendidos) [total: ${qaMetrics.tool_missing_count}]`)
  }

  // Fechamento QA — valida expressão comercial da ANA
  if (currentStage === 'fechamento' && msg.content?.trim()) {
    const violations = validateFechamentoContent(msg.content)
    if (violations.length > 0) {
      console.log(`\n  ⚠️  [QA] FECHAMENTO_VIOLATION:`)
      for (const v of violations) {
        console.log(`     • ${v}`)
        if (v.includes('promise')) qaMetrics.fechamento_promise_violations++
        else if (v.includes('memory')) qaMetrics.fechamento_memory_violations++
      }
      console.log()
    }
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
  console.log('║  /gates /speech /memory /qa /reset /save  |  Ctrl+C encerra  ║')
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
      ? (typeof speechProgress.parte_atual === 'number'
          ? ` | Speech P${speechProgress.parte_atual} ${speechProgress.state}`
          : ` | FINAL ${speechProgress.state}`)
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
      memoryStore.forEach((entry, k) => console.log(`  ${k}: "${entry.value}" [${entry.source}]${entry.raw_evidence ? ' — ev: "' + entry.raw_evidence + '"' : ''}`))
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

    if (input.trim() === '/qa') {
      console.log('\n📊 QA METRICS')
      console.log(`   P1 attempts:          ${qaMetrics.p1_attempt_count}`)
      console.log(`   P1 first-pass GOLD:   ${qaMetrics.p1_first_pass_success}`)
      console.log(`   P1 retries (RECOVERED):${qaMetrics.p1_retry_count}`)
      console.log(`   Guard triggers:       ${qaMetrics.guard_trigger_count}`)
      console.log(`   Tool missing:         ${qaMetrics.tool_missing_count}`)
      console.log(`   Auto-register:        ${qaMetrics.auto_register_count}`)
      console.log(`   Memory violations:    ${qaMetrics.memory_violation_count}`)
      console.log(`   Scope violations:     ${qaMetrics.scope_violation_count}`)
      console.log(`   Trailing text:        ${qaMetrics.trailing_text_count}`)
      console.log(`   Fechamento promise ⚠: ${qaMetrics.fechamento_promise_violations}`)
      console.log(`   Fechamento memory ⚠:  ${qaMetrics.fechamento_memory_violations}`)
      const total = qaMetrics.p1_attempt_count
      if (total > 0) {
        const gold = qaMetrics.p1_first_pass_success
        const recovered = total - gold - (total - qaMetrics.p1_first_pass_success - qaMetrics.p1_retry_count > 0 ? 0 : 0)
        console.log(`\n   Resultado P1:`)
        console.log(`   → GOLD (1ª tentativa):    ${gold}/${total}`)
        console.log(`   → RECOVERED (retry OK):   ${Math.max(0, total - gold - (qaMetrics.guard_trigger_count > 0 ? 1 : 0))}/${total}`)
        console.log(`   → FAILED (não recuperou): calculado no /speech`)
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
