// Test: stage detection logic — run with: node test-stage-detection.mjs
// Tests the exact same code that runs in realtime.ts

const STAGE_PATTERNS = [
  { stage: 'apresentacao', patterns: [/qual (é |e )?(o )?teu nome/i, /como (eu |)posso te chamar/i, /como você se chama/i, /pra eu te chamar/i, /quem me indicou/i, /como (eu |)posso te? (chamar|identificar)/i] },
  { stage: 'conexao',      patterns: [/me conta (seu|o) dia a dia/i, /me fala mais sobre/i, /o que você faz/i, /tem filhos/i, /família/i] },
  { stage: 'combinado',    patterns: [/combinad[ao]/i, /no final apresent/i, /decisão no final/i, /sim ou não/i] },
  { stage: 'speech',       patterns: [/pellet/i, /implante hormonal/i, /grão de arroz/i, /libera hormônios/i, /testosterona/i, /estrogênio/i] },
  { stage: 'fechamento',   patterns: [/lembra do nosso combinado/i, /faz sentido pra você/i, /sua decisão/i, /fechar/i, /investimento/i, /quanto custa/i] },
  { stage: 'pagamento',    patterns: [/pix ou cartão/i, /forma de pagamento/i, /vou gerar (o )?pix/i] },
  { stage: 'referidos',    patterns: [/conhece alguma amiga/i, /tem alguma (amiga|conhecida|pessoa) que/i, /me passa o (contato|número)/i, /vou te mandar.*link/i, /seu link de indicação/i] },
  { stage: 'encerramento', patterns: [/obrigada pela confiança/i, /foi um prazer/i, /até logo/i, /tchau/i] },
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
test('apresentacao: "Pra eu te chamar direito, qual é o teu nome?"', () =>
  eq(detectStageFromText('Pra eu te chamar direito, qual é o teu nome?'), 'apresentacao'))
test('apresentacao: real ANA phrase from test call', () =>
  eq(detectStageFromText('Oi, aqui é a ANA, da Hormone Ecosystem. Pra eu te atender direitinho, como eu posso te chamar?'), 'apresentacao'))
test('conexao: "Me conta seu dia a dia"', () =>
  eq(detectStageFromText('Me conta seu dia a dia, o que você faz?'), 'conexao'))
test('combinado: "combinado"', () =>
  eq(detectStageFromText('Antes de continuar, quero fazer um combinado com você.'), 'combinado'))
test('speech: "pellet"', () =>
  eq(detectStageFromText('O procedimento é um pellet, um implante hormonal.'), 'speech'))
test('fechamento: "faz sentido pra você"', () =>
  eq(detectStageFromText('Faz sentido pra você avançar?'), 'fechamento'))
test('pagamento: "pix ou cartão"', () =>
  eq(detectStageFromText('Você prefere pix ou cartão?'), 'pagamento'))
test('referidos: "conhece alguma amiga"', () =>
  eq(detectStageFromText('Você conhece alguma amiga que também poderia se beneficiar?'), 'referidos'))
test('referidos: NAO dispara em "indicacao" de conexao', () =>
  eq(detectStageFromText('Como é que você chegou até a gente? Foi indicação de alguém?'), null))
test('referidos: NAO dispara "indicacao" contextual como referidos', () =>
  eq(detectStageFromText('Foi indicação de alguém ou encontrou por conta própria?'), null))
test('encerramento: "foi um prazer"', () =>
  eq(detectStageFromText('Foi um prazer conversar com você!'), 'encerramento'))
test('no match returns null', () =>
  eq(detectStageFromText('Tudo bem, obrigada!'), null))

console.log('\n── makeStageTracker (no backwards, index -1 fix) ──')
test('E1 apresentacao is written on first detection (index 0 not blocked)', () => {
  const t = makeStageTracker()
  const r = t.advance('Pra eu te chamar direito, qual é o teu nome?')
  eq(r, 'apresentacao')
})
test('stages advance in order', () => {
  const t = makeStageTracker()
  t.advance('qual é o teu nome?')  // apresentacao
  t.advance('me conta seu dia a dia')  // conexao
  t.advance('quero fazer um combinado')  // combinado
  eq(t.log.join(','), 'apresentacao,conexao,combinado')
})
test('does not go backwards', () => {
  const t = makeStageTracker()
  t.advance('qual é o teu nome?')  // apresentacao idx=0
  t.advance('qual é o teu nome?')  // apresentacao again — blocked
  eq(t.log.length, 1)
})
test('skips stages (e.g. goes from apresentacao direct to speech)', () => {
  const t = makeStageTracker()
  t.advance('qual é o teu nome?')  // apresentacao idx=0
  t.advance('o procedimento é um pellet')  // speech idx=3
  eq(t.log.join(','), 'apresentacao,speech')
})
test('full conversation flow', () => {
  const t = makeStageTracker()
  const phrases = [
    'Oi, aqui é a ANA, da Hormone Ecosystem. Pra eu te atender direitinho, como eu posso te chamar?',
    'Que legal, Maria! Me conta seu dia a dia, o que você faz?',
    'Antes de a gente continuar, quero fazer um combinado com você.',
    'O procedimento é um pellet, um implante hormonal do tamanho de um grão de arroz.',
    'Faz sentido pra você avançar com isso?',
    'Você prefere pix ou cartão?',
    'Você conhece alguma amiga que poderia se beneficiar?',
    'Foi um prazer conversar com você!',
  ]
  phrases.forEach(p => t.advance(p))
  eq(t.log.join(','), 'apresentacao,conexao,combinado,speech,fechamento,pagamento,referidos,encerramento')
})

console.log(`\n── Result: ${passed} passed, ${failed} failed ──\n`)
if (failed > 0) process.exit(1)
