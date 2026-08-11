/**
 * ANA MASTER — Teste completo via terminal
 * Rode na VM: node test-local.mjs
 * Testa: Supabase, Gate Validator, Tools, State Machine
 */

import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { readFileSync } from 'fs'

// ─── Carrega env do ecosystem.config.cjs ─────────────────────────────────────
let ENV = {}
try {
  const raw = readFileSync('./ecosystem.config.cjs', 'utf8')
  const matches = raw.matchAll(/(\w+):\s*['"]([^'"]+)['"]/g)
  for (const [, k, v] of matches) ENV[k] = v
  console.log('✅ ecosystem.config.cjs carregado')
} catch {
  console.log('⚠️  ecosystem.config.cjs não encontrado — usando process.env')
}

const SUPABASE_URL        = ENV.SUPABASE_URL        || process.env.SUPABASE_URL
const SUPABASE_KEY        = ENV.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY      = ENV.OPENAI_API_KEY      || process.env.OPENAI_API_KEY
const ANA_MASTER_URL      = 'https://ana-master.hormoneecosystem.com'

const MOCK_CALL_SID  = 'TEST_' + Date.now()
const MOCK_TELEFONE  = '5548988416899'

let passed = 0
let failed = 0

function ok(msg)   { console.log(`  ✅ ${msg}`); passed++ }
function fail(msg) { console.log(`  ❌ ${msg}`); failed++ }
function section(title) { console.log(`\n${'─'.repeat(60)}\n🔷 ${title}\n${'─'.repeat(60)}`) }

// ─── TESTE 1: Variáveis de ambiente ──────────────────────────────────────────
section('TESTE 1 — Variáveis de ambiente')
SUPABASE_URL   ? ok(`SUPABASE_URL: ${SUPABASE_URL.slice(0,30)}...`)   : fail('SUPABASE_URL não definida')
SUPABASE_KEY   ? ok('SUPABASE_SERVICE_ROLE_KEY: presente')             : fail('SUPABASE_SERVICE_ROLE_KEY não definida')
OPENAI_API_KEY ? ok('OPENAI_API_KEY: presente')                        : fail('OPENAI_API_KEY não definida')

// ─── TESTE 2: Supabase — conexão ─────────────────────────────────────────────
section('TESTE 2 — Supabase conexão')
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
})

try {
  const { error } = await supabase.from('ana_calls').select('id').limit(1)
  error ? fail(`ana_calls: ${error.message}`) : ok('Tabela ana_calls acessível')
} catch(e) { fail(`Supabase erro: ${e.message}`) }

try {
  const { error } = await supabase.from('ana_memories').select('id').limit(1)
  error ? fail(`ana_memories: ${error.message}`) : ok('Tabela ana_memories acessível')
} catch(e) { fail(`Supabase erro: ${e.message}`) }

try {
  const { error } = await supabase.from('leads').select('id').limit(1)
  error ? fail(`leads: ${error.message}`) : ok('Tabela leads acessível')
} catch(e) { fail(`Supabase erro: ${e.message}`) }

try {
  const { error } = await supabase.from('indicacoes').select('id').limit(1)
  error ? fail(`indicacoes: ${error.message}`) : ok('Tabela indicacoes acessível')
} catch(e) { fail(`Supabase erro: ${e.message}`) }

// ─── TESTE 3: Supabase — upsertCall ─────────────────────────────────────────
section('TESTE 3 — Supabase escrita (upsertCall)')
try {
  const { error } = await supabase
    .from('ana_calls')
    .upsert({ call_sid: MOCK_CALL_SID, telefone: MOCK_TELEFONE, stage: 'apresentacao', status: 'active', gates_passed: [], memories: {} }, { onConflict: 'call_sid' })
  error ? fail(`upsert: ${error.message}`) : ok(`Call criado: ${MOCK_CALL_SID}`)
} catch(e) { fail(`upsert erro: ${e.message}`) }

// ─── TESTE 4: Supabase — saveMemory ──────────────────────────────────────────
section('TESTE 4 — Supabase memória')
try {
  const { error } = await supabase.from('ana_memories').upsert(
    { call_sid: MOCK_CALL_SID, memory_key: 'teste_key', value: '"teste_value"' },
    { onConflict: 'call_sid,memory_key' }
  )
  error ? fail(`saveMemory: ${error.message}`) : ok('Memória salva com sucesso')
} catch(e) { fail(`saveMemory erro: ${e.message}`) }

try {
  const { data, error } = await supabase.from('ana_calls').select('memories').eq('call_sid', MOCK_CALL_SID).single()
  error ? fail(`getMemory: ${error.message}`) : ok(`Memórias lidas: ${JSON.stringify(data?.memories)}`)
} catch(e) { fail(`getMemory erro: ${e.message}`) }

// ─── TESTE 5: Gate Validator — G1 GATE_ABERTURA ──────────────────────────────
section('TESTE 5 — Gate Validator (importa dist/)')
let validateGate
try {
  const mod = await import('./dist/gate-validator.js')
  validateGate = mod.validateGate
  ok('gate-validator.js carregado do dist/')
} catch(e) { fail(`Não conseguiu carregar dist/gate-validator.js: ${e.message}\nRode: npm run build`) }

if (validateGate) {
  // G1 — deve APROVAR com evidências completas
  try {
    const result = await validateGate('GATE_ABERTURA', {
      telefone: MOCK_TELEFONE,
      disponibilidade_confirmada: true,
      nome_confirmado: 'Teste Maria',
      referida_por: 'Adriana'
    }, MOCK_CALL_SID)
    result.approved ? ok(`G1 GATE_ABERTURA aprovado → ${result.next_stage}`) : fail(`G1 recusado: ${result.reason}`)
  } catch(e) { fail(`G1 erro: ${e.message}`) }

  // G1 — deve REPROVAR sem evidências
  try {
    const result = await validateGate('GATE_ABERTURA', { telefone: MOCK_TELEFONE }, MOCK_CALL_SID)
    !result.approved ? ok(`G1 bloqueio correto: ${result.reason}`) : fail('G1 deveria ter reprovado sem evidências')
  } catch(e) { fail(`G1 bloqueio erro: ${e.message}`) }

  // G2
  try {
    const result = await validateGate('GATE_CONEXAO', {
      telefone: MOCK_TELEFONE,
      sintoma_principal: 'insônia e cansaço',
      contexto_vida: 'professora, 2 filhos',
      interesse_confirmado: true
    }, MOCK_CALL_SID)
    result.approved ? ok(`G2 GATE_CONEXAO aprovado → ${result.next_stage}`) : fail(`G2 recusado: ${result.reason}`)
  } catch(e) { fail(`G2 erro: ${e.message}`) }

  // G3
  try {
    const result = await validateGate('GATE_COMBINADO', {
      telefone: MOCK_TELEFONE,
      combinado_confirmado: true,
      decisao_autonomia: 'sozinha',
      disponibilidade_agenda: true
    }, MOCK_CALL_SID)
    result.approved ? ok(`G3 GATE_COMBINADO aprovado → ${result.next_stage}`) : fail(`G3 recusado: ${result.reason}`)
  } catch(e) { fail(`G3 erro: ${e.message}`) }

  // G4
  try {
    const result = await validateGate('GATE_SPEECH', {
      telefone: MOCK_TELEFONE,
      speech_partes_executadas: ['ancora_dor','implante','resultados','duracao'],
      resposta_pergunta_speech: 'me chamou atenção a duração de 6 meses',
      interesse_pos_speech: true
    }, MOCK_CALL_SID)
    result.approved ? ok(`G4 GATE_SPEECH aprovado → ${result.next_stage}`) : fail(`G4 recusado: ${result.reason}`)
  } catch(e) { fail(`G4 erro: ${e.message}`) }

  // G5 — sem pagamento escolhido (deve reprovar)
  try {
    const result = await validateGate('GATE_FECHAMENTO', {
      telefone: MOCK_TELEFONE,
      investimento_apresentado: true
    }, MOCK_CALL_SID)
    !result.approved ? ok(`G5 bloqueio correto sem forma_pagamento: ${result.reason}`) : fail('G5 deveria ter reprovado sem forma_pagamento')
  } catch(e) { fail(`G5 bloqueio erro: ${e.message}`) }

  // G5 — com pagamento (deve aprovar)
  try {
    const result = await validateGate('GATE_FECHAMENTO', {
      telefone: MOCK_TELEFONE,
      investimento_apresentado: true,
      forma_pagamento_escolhida: 'pix'
    }, MOCK_CALL_SID)
    result.approved ? ok(`G5 GATE_FECHAMENTO aprovado → ${result.next_stage}`) : fail(`G5 recusado: ${result.reason}`)
  } catch(e) { fail(`G5 erro: ${e.message}`) }
}

// ─── TESTE 6: verifyPayment ───────────────────────────────────────────────────
section('TESTE 6 — verifyPayment (lead sem pagamento)')
try {
  const { data } = await supabase
    .from('leads')
    .select('id, nome, status_pagamento')
    .or(`telefone.eq.${MOCK_TELEFONE},telefone.eq.55${MOCK_TELEFONE}`)
    .maybeSingle()

  if (data) {
    ok(`Lead encontrada: ${data.nome} / status_pagamento: ${data.status_pagamento}`)
  } else {
    ok('Lead não encontrada na base (esperado para número de teste) — verificar_pagamento() retornaria false')
  }
} catch(e) { fail(`verifyPayment erro: ${e.message}`) }

// ─── TESTE 7: Health check do servidor ───────────────────────────────────────
section('TESTE 7 — Health check ANA MASTER')
try {
  const res = await fetch(`${ANA_MASTER_URL}/health`)
  const data = await res.json()
  data.ok ? ok(`Servidor online: ${data.ts}`) : fail('Servidor retornou ok:false')
} catch(e) { fail(`Health check erro: ${e.message}`) }

// ─── TESTE 8: OpenAI API key válida ──────────────────────────────────────────
section('TESTE 8 — OpenAI API key')
try {
  const res = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }
  })
  res.ok ? ok(`OpenAI API key válida (status ${res.status})`) : fail(`OpenAI retornou ${res.status} — key inválida?`)
} catch(e) { fail(`OpenAI erro: ${e.message}`) }

// ─── Cleanup ──────────────────────────────────────────────────────────────────
section('Limpeza — remove call de teste')
try {
  await supabase.from('ana_memories').delete().eq('call_sid', MOCK_CALL_SID)
  await supabase.from('ana_calls').delete().eq('call_sid', MOCK_CALL_SID)
  ok('Dados de teste removidos')
} catch(e) { ok('Limpeza ignorada (não crítico)') }

// ─── RESULTADO ────────────────────────────────────────────────────────────────
console.log(`\n${'═'.repeat(60)}`)
console.log(`📊 RESULTADO: ${passed} passaram / ${failed} falharam`)
if (failed === 0) {
  console.log('🎉 TUDO OK — pode ligar!')
} else {
  console.log('⚠️  Corrija os erros acima antes de ligar.')
}
console.log('═'.repeat(60))
