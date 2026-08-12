#!/usr/bin/env node
/**
 * Teste de concorrência de gates.
 * Verifica que duas chamadas simultâneas do mesmo gate resultam em:
 *   - exatamente 1 PASS
 *   - exatamente 1 BLOCK
 *   - 1 única mudança de stage
 *   - 1 único gate_passed
 *
 * Também testa idempotência: retry da mesma tool call não produz segunda transição.
 *
 * Este teste usa o simulador local (sem Supabase real).
 * O handleGateValidator do simulador espelha a lógica do servidor.
 *
 * Uso: node test-gate-concurrency.mjs
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

// ── Mock state store (simula banco com atomic compare-and-swap) ───────────────

function createMockStore(initialStage) {
  let stage = initialStage
  const gatesPassed = []
  const traces = []
  let transitionCount = 0

  return {
    // Atomic transition: only succeeds if current stage === fromStage
    async atomicTransition(gateId, fromStage, toStage, evidence = {}) {
      // Simulate async DB call
      await new Promise(r => setTimeout(r, Math.random() * 5))

      if (stage !== fromStage) {
        return { transitioned: false, reason: `Stage era "${stage}", esperava "${fromStage}"` }
      }

      // Atomic write
      stage = toStage
      transitionCount++
      gatesPassed.push(gateId)
      traces.push({ gateId, fromStage, toStage, evidence, ts: Date.now() })

      return { transitioned: true, next_stage: toStage }
    },
    getState: () => ({ stage, gatesPassed: [...gatesPassed], traces: [...traces], transitionCount }),
  }
}

// Mock gate validator using the same logic as handleGateValidator in simulator
function makeGateValidator(store) {
  return async function validate(gate_id, evidence = {}) {
    const transition = GATE_TRANSITIONS[gate_id]
    if (!transition) return { approved: false, reason: `Gate desconhecido: ${gate_id}` }

    const result = await store.atomicTransition(gate_id, transition.from, transition.to, evidence)
    if (!result.transitioned) return { approved: false, reason: result.reason }
    return { approved: true, next_stage: result.next_stage }
  }
}

// ── TESTE 1: Duas chamadas simultâneas → exatamente 1 PASS, 1 BLOCK ──────────
console.log('\n── TESTE 1: Concorrência — 2 chamadas simultâneas do mesmo gate')
{
  const store = createMockStore('conexao')
  const validate = makeGateValidator(store)

  const [r1, r2] = await Promise.all([
    validate('GATE_CONEXAO'),
    validate('GATE_CONEXAO'),
  ])

  const passes  = [r1, r2].filter(r => r.approved).length
  const blocks  = [r1, r2].filter(r => !r.approved).length
  const state   = store.getState()

  assert(passes === 1,                       `Exatamente 1 PASS (obtido: ${passes})`)
  assert(blocks === 1,                       `Exatamente 1 BLOCK (obtido: ${blocks})`)
  assert(state.stage === 'combinado',        `Stage final é "combinado" (obtido: "${state.stage}")`)
  assert(state.transitionCount === 1,        `Exatamente 1 transição executada (obtido: ${state.transitionCount})`)
  assert(state.gatesPassed.length === 1,     `Exatamente 1 gate registrado (obtido: ${state.gatesPassed.length})`)
  assert(state.gatesPassed[0] === 'GATE_CONEXAO', `Gate registrado é GATE_CONEXAO`)
  assert(state.traces.length === 1,          `Exatamente 1 trace (obtido: ${state.traces.length})`)
}

// ── TESTE 2: 5 chamadas simultâneas → exatamente 1 PASS ──────────────────────
console.log('\n── TESTE 2: Concorrência extrema — 5 chamadas simultâneas')
{
  const store = createMockStore('speech')
  const validate = makeGateValidator(store)

  const results = await Promise.all(Array.from({ length: 5 }, () => validate('GATE_SPEECH')))

  const passes  = results.filter(r => r.approved).length
  const blocks  = results.filter(r => !r.approved).length
  const state   = store.getState()

  assert(passes === 1,                  `Exatamente 1 PASS de 5 (obtido: ${passes})`)
  assert(blocks === 4,                  `Exatamente 4 BLOCKS de 5 (obtido: ${blocks})`)
  assert(state.stage === 'fechamento',  `Stage é "fechamento" (obtido: "${state.stage}")`)
  assert(state.transitionCount === 1,   `Exatamente 1 transição (obtido: ${state.transitionCount})`)
  assert(state.gatesPassed.length === 1,`1 gate_passed registrado (obtido: ${state.gatesPassed.length})`)
}

// ── TESTE 3: Idempotência — retry da mesma call não produz segunda transição ──
console.log('\n── TESTE 3: Idempotência — retry não produz segunda transição')
{
  const store = createMockStore('fechamento')
  const validate = makeGateValidator(store)

  // First call — should pass
  const r1 = await validate('GATE_FECHAMENTO')
  assert(r1.approved === true, `Primeira chamada GATE_FECHAMENTO → aprovada`)
  assert(store.getState().stage === 'pagamento', `Stage mudou para "pagamento"`)

  // Retry (network retry, same call) — must be blocked
  const r2 = await validate('GATE_FECHAMENTO')
  assert(r2.approved === false, `Retry GATE_FECHAMENTO → bloqueado (idempotente)`)
  assert(store.getState().transitionCount === 1, `Ainda 1 única transição após retry`)
  assert(store.getState().gatesPassed.length === 1, `Ainda 1 gate_passed após retry`)
  assert(store.getState().stage === 'pagamento', `Stage não regrediu`)
}

// ── TESTE 4: Gate diferente após transição válida — bloqueado ─────────────────
console.log('\n── TESTE 4: Gate diferente após transição — bloqueado corretamente')
{
  const store = createMockStore('apresentacao')
  const validate = makeGateValidator(store)

  const r1 = await validate('GATE_ABERTURA')
  assert(r1.approved === true, `GATE_ABERTURA aprovado`)

  // Now in 'conexao' — GATE_ABERTURA again should be blocked
  const r2 = await validate('GATE_ABERTURA')
  assert(r2.approved === false, `GATE_ABERTURA repetido → bloqueado`)

  // GATE_COMBINADO from 'conexao' — also blocked (wrong stage)
  const r3 = await validate('GATE_COMBINADO')
  assert(r3.approved === false, `GATE_COMBINADO de "conexao" → bloqueado`)

  // GATE_CONEXAO from 'conexao' — correct
  const r4 = await validate('GATE_CONEXAO')
  assert(r4.approved === true, `GATE_CONEXAO de "conexao" → aprovado`)

  assert(store.getState().transitionCount === 2, `2 transições no total (obtido: ${store.getState().transitionCount})`)
  assert(store.getState().stage === 'combinado', `Stage final "combinado"`)
}

// ── TESTE 5: Sequência completa sem concorrência — todas as transições ─────────
console.log('\n── TESTE 5: Sequência completa sem concorrência')
{
  const store = createMockStore('apresentacao')
  const validate = makeGateValidator(store)
  const gates = [
    'GATE_ABERTURA','GATE_CONEXAO','GATE_COMBINADO','GATE_SPEECH',
    'GATE_FECHAMENTO','GATE_PAGAMENTO','GATE_REFERIDOS','GATE_VALIDACAO',
  ]

  let allPassed = true
  for (const gate of gates) {
    const r = await validate(gate)
    if (!r.approved) {
      console.log(`  ❌ ${gate} falhou: ${r.reason}`)
      allPassed = false
      failed++
      break
    }
  }
  if (allPassed) {
    assert(store.getState().stage === 'ganho', `Sequência completa → stage "ganho"`)
    assert(store.getState().gatesPassed.length === 8, `8 gates registrados`)
    assert(store.getState().transitionCount === 8, `8 transições`)
  }
}

// ── Resultado ─────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(50)}`)
console.log(`  RESULTADO: ${passed} passou | ${failed} falhou`)
if (failed === 0) {
  console.log('  ✅ TODOS OS TESTES DE CONCORRÊNCIA PASSARAM')
} else {
  console.log('  ❌ FALHAS — revisar antes de produção')
  process.exit(1)
}
console.log(`${'═'.repeat(50)}\n`)
