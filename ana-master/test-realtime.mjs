/**
 * TEST REALTIME — testa conexão OpenAI Realtime sem Twilio/ligação
 * Roda: node test-realtime.mjs
 * Consome ~1-2 centavos de crédito (só texto, sem áudio)
 */

import { readFileSync } from 'fs'
import WebSocket from 'ws'

// Carrega env
let ENV = {}
try {
  const raw = readFileSync('./ecosystem.config.cjs', 'utf8')
  for (const [, k, v] of raw.matchAll(/(\w+):\s*['"]([^'"]+)['"]/g)) ENV[k] = v
  console.log('✅ ecosystem.config.cjs carregado')
} catch { console.log('⚠️  usando process.env') }

const OPENAI_API_KEY = ENV.OPENAI_API_KEY || process.env.OPENAI_API_KEY
const MODEL = 'gpt-realtime-2.1'

if (!OPENAI_API_KEY) { console.log('❌ OPENAI_API_KEY não encontrada'); process.exit(1) }
console.log(`🔑 Chave: ${OPENAI_API_KEY.slice(0, 20)}...${OPENAI_API_KEY.slice(-6)}`)
console.log(`🤖 Modelo: ${MODEL}`)
console.log('🔌 Conectando na OpenAI Realtime API...\n')

const ws = new WebSocket(`wss://api.openai.com/v1/realtime?model=${MODEL}`, {
  headers: {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  },
})

let passed = 0
let failed = 0
let done = false
const timeout = setTimeout(() => {
  if (!done) { console.log('\n❌ TIMEOUT — sem resposta em 15s'); process.exit(1) }
}, 15000)

ws.on('open', () => {
  console.log('✅ WebSocket conectado na OpenAI')
  passed++

  // Configura sessão — modo texto para não gastar crédito de áudio
  ws.send(JSON.stringify({
    type: 'session.update',
    session: {
      type: 'realtime',
      modalities: ['text'],
      instructions: 'Responda apenas: "ANA ONLINE"',
    },
  }))

  // Envia mensagem de teste
  ws.send(JSON.stringify({
    type: 'conversation.item.create',
    item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'teste' }] },
  }))

  ws.send(JSON.stringify({ type: 'response.create' }))
})

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString())

  if (msg.type === 'session.created') {
    console.log(`✅ Sessão criada — id: ${msg.session?.id}`)
    passed++
  }

  if (msg.type === 'session.updated') {
    console.log('✅ Sessão configurada (text mode)')
    passed++
  }

  if (msg.type === 'response.text.delta') {
    process.stdout.write(msg.delta ?? '')
  }

  if (msg.type === 'response.done') {
    const text = msg.response?.output?.[0]?.content?.[0]?.text ?? ''
    console.log(`\n✅ Resposta recebida: "${text}"`)
    passed++
    done = true
    clearTimeout(timeout)
    ws.close()
    console.log(`\n${'═'.repeat(50)}`)
    console.log(`📊 RESULTADO: ${passed} OK / ${failed} FALHOU`)
    if (failed === 0) console.log('🎉 SDK OK — pode ligar!')
    else console.log('⚠️  Corrija os erros antes de ligar.')
    console.log('═'.repeat(50))
    process.exit(0)
  }

  if (msg.type === 'error') {
    console.log(`\n❌ ERRO OpenAI: [${msg.error?.code}] ${msg.error?.message}`)
    failed++
    done = true
    clearTimeout(timeout)
    ws.close()
    process.exit(1)
  }
})

ws.on('error', (err) => {
  console.log(`❌ WebSocket erro: ${err.message}`)
  failed++
  process.exit(1)
})
