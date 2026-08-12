#!/usr/bin/env node
/**
 * Testes automatizados de invariância de gate.
 * Valida que nenhuma combinação de gate + stage errado pode alterar o processo.
 *
 * Uso: node test-gate-invariants.mjs
 */

import { GATE_TRANSITIONS } from './dist/state-machine.js'

let passed = 0
let failed = 0

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.log(`  ❌ FALHOU: ${label}`)
    failed++
  }
}

// ── Simulação do handleGateValidator (espelho do simulador) ───────────────────

function makeValidator(currentStage) {
  return function handleGateValidator(gate_id) {
    const transition = GATE_TRANSITIONS[gate_id]
    if (!transition) return { approved: false, reason: `Gate desconhecido: ${gate_id}` }
    if (currentStage !== transition.from) {
      return {
        approved: false,
        reason: `${gate_id} bloqueado — stage atual é "${currentStage}", mas este gate exige "${transition.from}".`,
      }
    }
    return { approved: true, next_stage: transition.to }
  }
}

// ── TESTE 1: Gate correto + stage correto → PASSA ─────────────────────────────
console.log('\n── TESTE 1: Gate correto + stage correto → PASSA')
for (const [gate, { from, to }] of Object.entries(GATE_TRANSITIONS)) {
  const validate = makeValidator(from)
  const result = validate(gate)
  assert(result.approved === true, `${gate} de "${from}" → aprovado, next="${result.next_stage}"`)
  assert(result.next_stage === to, `${gate} transita para "${to}"`)
}

// ── TESTE 2: Gate correto + stage errado → BLOQUEIA ──────────────────────────
console.log('\n── TESTE 2: Gate correto + stage errado → BLOQUEIA')
const allStages = ['apresentacao','conexao','combinado','speech','fechamento','pagamento','referidos','validacao','ganho']
for (const [gate, { from }] of Object.entries(GATE_TRANSITIONS)) {
  const wrongStages = allStages.filter(s => s !== from)
  for (const wrongStage of wrongStages) {
    const validate = makeValidator(wrongStage)
    const result = validate(gate)
    assert(result.approved === false, `${gate} de "${wrongStage}" (errado) → bloqueado`)
  }
}

// ── TESTE 3: Gate futuro chamado antecipadamente → BLOQUEIA ──────────────────
console.log('\n── TESTE 3: Gate futuro chamado antecipadamente → BLOQUEIA')
const validate_apresentacao = makeValidator('apresentacao')
assert(validate_apresentacao('GATE_SPEECH').approved === false,   'GATE_SPEECH de apresentacao → bloqueado')
assert(validate_apresentacao('GATE_FECHAMENTO').approved === false,'GATE_FECHAMENTO de apresentacao → bloqueado')
assert(validate_apresentacao('GATE_VALIDACAO').approved === false, 'GATE_VALIDACAO de apresentacao → bloqueado')

const validate_speech = makeValidator('speech')
assert(validate_speech('GATE_FECHAMENTO').approved === false, 'GATE_FECHAMENTO de speech → bloqueado')
assert(validate_speech('GATE_PAGAMENTO').approved === false,  'GATE_PAGAMENTO de speech → bloqueado')
assert(validate_speech('GATE_VALIDACAO').approved === false,  'GATE_VALIDACAO de speech → bloqueado')

// ── TESTE 4: Gate anterior chamado novamente → BLOQUEIA ──────────────────────
console.log('\n── TESTE 4: Gate anterior chamado novamente → BLOQUEIA')
const validate_conexao = makeValidator('conexao')
assert(validate_conexao('GATE_ABERTURA').approved === false, 'GATE_ABERTURA de conexao (já passou) → bloqueado')

const validate_fechamento = makeValidator('fechamento')
assert(validate_fechamento('GATE_ABERTURA').approved === false,  'GATE_ABERTURA de fechamento → bloqueado')
assert(validate_fechamento('GATE_SPEECH').approved === false,    'GATE_SPEECH de fechamento → bloqueado')
assert(validate_fechamento('GATE_COMBINADO').approved === false, 'GATE_COMBINADO de fechamento → bloqueado')

// ── TESTE 5: Gate desconhecido → BLOQUEIA ────────────────────────────────────
console.log('\n── TESTE 5: Gate desconhecido → BLOQUEIA')
const validate_any = makeValidator('apresentacao')
assert(validate_any('GATE_INEXISTENTE').approved === false, 'GATE_INEXISTENTE → bloqueado')
assert(validate_any('').approved === false,                 'gate vazio → bloqueado')
assert(validate_any('gate_abertura').approved === false,    'gate case-errado → bloqueado')

// ── TESTE 6: Sequência completa válida ────────────────────────────────────────
console.log('\n── TESTE 6: Sequência completa válida (todos os gates em ordem)')
const sequence = [
  'GATE_ABERTURA','GATE_CONEXAO','GATE_COMBINADO','GATE_SPEECH',
  'GATE_FECHAMENTO','GATE_PAGAMENTO','GATE_REFERIDOS','GATE_VALIDACAO',
]
let stage = 'apresentacao'
let sequenceOk = true
for (const gate of sequence) {
  const validate = makeValidator(stage)
  const result = validate(gate)
  if (!result.approved) {
    console.log(`  ❌ Sequência quebrou em ${gate} (stage=${stage})`)
    sequenceOk = false
    failed++
    break
  }
  stage = result.next_stage
}
if (sequenceOk) {
  assert(stage === 'ganho', `Sequência completa termina em "ganho" (atual: "${stage}")`)
}

// ── TESTE 7: GATE_TRANSITIONS importado do mesmo módulo que o servidor ────────
console.log('\n── TESTE 7: Fonte única — GATE_TRANSITIONS tem todos os gates esperados')
const expectedGates = [
  'GATE_ABERTURA','GATE_CONEXAO','GATE_COMBINADO','GATE_SPEECH',
  'GATE_FECHAMENTO','GATE_PAGAMENTO','GATE_REFERIDOS','GATE_VALIDACAO',
]
for (const gate of expectedGates) {
  assert(gate in GATE_TRANSITIONS, `${gate} presente em GATE_TRANSITIONS`)
}
assert(Object.keys(GATE_TRANSITIONS).length === expectedGates.length, `Nenhum gate extra ou faltando (total=${Object.keys(GATE_TRANSITIONS).length})`)

// ── Resultado ─────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(50)}`)
console.log(`  RESULTADO: ${passed} passou | ${failed} falhou`)
if (failed === 0) {
  console.log('  ✅ TODOS OS INVARIANTES DE GATE ESTÃO CORRETOS')
} else {
  console.log('  ❌ FALHAS DETECTADAS — revisar antes de produção')
  process.exit(1)
}
console.log(`${'═'.repeat(50)}\n`)
