// Test: stage detection logic — run with: node test-stage-detection.mjs
// Tests the exact same code that runs in realtime.ts

const STAGE_PATTERNS = [
  { stage: 'apresentacao', patterns: [/qual é o teu nome/i, /pra eu te chamar direitinho/i, /pode repetir teu nome/i] },
  { stage: 'conexao',      patterns: [/me conta um pouco de como é o teu dia a dia/i, /me conta como é o teu dia a dia/i] },
  { stage: 'combinado',    patterns: [/vamos fazer um combinad[ao]/i, /combinadinh[ao]/i] },
  { stage: 'speech',       patterns: [/pellet/i, /implante hormonal/i, /grão de arroz/i] },
  { stage: 'fechamento',   patterns: [/lembra do nosso combinado/i, /faz sentido pra você/i, /pix ou cartão/i] },
  { stage: 'pagamento',    patterns: [/confirmei aqui/i, /pagamento recebido/i] },
  { stage: 'referidos',    patterns: [/você conhece alguma amiga/i, /tomou essa decisão tão importante/i] },
  { stage: 'encerramento', patterns: [/nossa equipe vai entrar em contato/i, /foi uma honra conversar/i, /cuida-se/i] },
]

const STAGE_ORDER = ['apresentacao', 'conexao', 'combinado', 'speech', 'fechamento', 'pagamento', 'referidos', 'encerramento']

function detectStageFromText(text) {
  for (const { stage, patterns } of STAGE_PATTERNS) {
    if (patterns.some(p => p.test(text))) return stage
  }
  return null
}

function makeStageTracker() {
  let currentIdx = -1
  const log = []
  return {
    advance(text) {
      const detected = detectStageFromText(text)
      if (!detected) return null
      const detectedIdx = STAGE_ORDER.indexOf(detected)
      if (detectedIdx <= currentIdx) return null
      currentIdx = detectedIdx
      log.push(detected)
      return detected
    },
    log
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────
let passed = 0
let failed = 0

function test(label, fn) {
  try {
    fn()
    console.log(`  ✅ ${label}`)
    passed++
  } catch (e) {
    console.log(`  ❌ ${label}: ${e.message}`)
    failed++
  }
}

function eq(a, b) {
  if (a !== b) throw new Error(`expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`)
}

console.log('\n── detectStageFromText ──')

// E1 — Abertura
test('E1: "Pra eu te chamar direitinho, qual é o teu nome?"', () =>
  eq(detectStageFromText('Pra eu te chamar direitinho, qual é o teu nome?'), 'apresentacao'))
test('E1: "pra eu te chamar direitinho"', () =>
  eq(detectStageFromText('Oi, aqui é a ANA. Pra eu te chamar direitinho, como você gosta de ser chamada?'), 'apresentacao'))
test('E1: "pode repetir teu nome"', () =>
  eq(detectStageFromText('Desculpa, cortou um pouquinho. Pode repetir teu nome, por favor?'), 'apresentacao'))
test('E1: NAO dispara em "obrigada" generico', () =>
  eq(detectStageFromText('Mari, obrigada. E me conta como você chegou até a gente?'), null))

// E2 — Conexão
test('E2: "me conta um pouco de como é o teu dia a dia"', () =>
  eq(detectStageFromText('Me conta um pouco de como é o teu dia a dia, no trabalho, na rotina.'), 'conexao'))
test('E2: "me conta como é o teu dia a dia"', () =>
  eq(detectStageFromText('Me conta como é o teu dia a dia.'), 'conexao'))
test('E2: NAO dispara em "familia" ou "filhos" sozinhos', () =>
  eq(detectStageFromText('Você tem família grande?'), null))

// E3 — Combinado
test('E3: "vamos fazer um combinado"', () =>
  eq(detectStageFromText('Maria, sei que teu tempo é precioso. Vamos fazer um combinado?'), 'combinado'))
test('E3: "vamos fazer um combinadinho"', () =>
  eq(detectStageFromText('Vamos fazer um combinadinho?'), 'combinado'))
test('E3: NAO dispara em "combinado" solto no meio de frase', () =>
  eq(detectStageFromText('Ficou combinado então que você me liga depois?'), null))

// E4 — Speech
test('E4: "pellet"', () =>
  eq(detectStageFromText('O procedimento é um pellet, um pequeno cilindro.'), 'speech'))
test('E4: "implante hormonal"', () =>
  eq(detectStageFromText('É um implante hormonal colocado sob a pele.'), 'speech'))
test('E4: "grão de arroz"', () =>
  eq(detectStageFromText('É do tamanho aproximado de um grão de arroz.'), 'speech'))

// E5 — Fechamento
test('E5: "lembra do nosso combinado"', () =>
  eq(detectStageFromText('Lembra do nosso combinado? Se fizesse sentido pra você, a gente avançava.'), 'fechamento'))
test('E5: "faz sentido pra você"', () =>
  eq(detectStageFromText('Faz sentido pra você?'), 'fechamento'))
test('E5: "pix ou cartão"', () =>
  eq(detectStageFromText('Como você prefere fazer: Pix ou cartão?'), 'fechamento'))

// E6 — Pagamento
test('E6: "confirmei aqui"', () =>
  eq(detectStageFromText('Confirmei aqui — pagamento recebido!'), 'pagamento'))
test('E6: "pagamento recebido"', () =>
  eq(detectStageFromText('Pagamento recebido, tudo certo!'), 'pagamento'))

// E7 — Referidos
test('E7: "você conhece alguma amiga"', () =>
  eq(detectStageFromText('Já que você tomou essa decisão, você conhece alguma amiga que também poderia se beneficiar?'), 'referidos'))
test('E7: "tomou essa decisão tão importante"', () =>
  eq(detectStageFromText('Maria, já que você tomou essa decisão tão importante pela sua saúde...'), 'referidos'))
test('E7: NAO dispara em "indicação" de conexao', () =>
  eq(detectStageFromText('Como é que você chegou até a gente? Foi indicação de alguém?'), null))

// E8 — Encerramento
test('E8: "nossa equipe vai entrar em contato"', () =>
  eq(detectStageFromText('Nossa equipe vai entrar em contato pra agendar teu procedimento.'), 'encerramento'))
test('E8: "foi uma honra conversar"', () =>
  eq(detectStageFromText('Foi uma honra conversar contigo. Cuida-se!'), 'encerramento'))
test('E8: "cuida-se"', () =>
  eq(detectStageFromText('Cuida-se!'), 'encerramento'))
test('E8: NAO dispara em "obrigada" generico', () =>
  eq(detectStageFromText('Obrigada por confirmar. Me conta mais.'), null))
test('E8: NAO dispara em "tchau" avulso', () =>
  eq(detectStageFromText('Tchau!'), null))

// Falsos positivos bloqueados
console.log('\n── Falsos positivos bloqueados ──')
test('NAO dispara E7 em "indicação" de abertura', () =>
  eq(detectStageFromText('Ah, então foi a Maria que te indicou. Que bom!'), null))
test('NAO dispara E8 em "obrigada" no meio da conversa', () =>
  eq(detectStageFromText('Mari, obrigada. E me conta, como é que você chegou até a gente?'), null))
test('NAO dispara E3 em "combinado" avulso', () =>
  eq(detectStageFromText('Ficou combinado então.'), null))

// Conversa completa
console.log('\n── Conversa completa E1→E8 ──')
test('fluxo completo em ordem', () => {
  const t = makeStageTracker()
  const frases = [
    'Pra eu te chamar direitinho, qual é o teu nome?',
    'Me conta um pouco de como é o teu dia a dia, no trabalho, na rotina.',
    'Vamos fazer um combinado?',
    'O procedimento é um pellet, um pequeno cilindro colocado sob a pele.',
    'Faz sentido pra você?',
    'Confirmei aqui — pagamento recebido!',
    'Você conhece alguma amiga que também poderia se beneficiar?',
    'Nossa equipe vai entrar em contato pra agendar teu procedimento.',
  ]
  frases.forEach(f => t.advance(f))
  eq(t.log.join(','), 'apresentacao,conexao,combinado,speech,fechamento,pagamento,referidos,encerramento')
})

console.log(`\n── Result: ${passed} passed, ${failed} failed ──\n`)
if (failed > 0) process.exit(1)
