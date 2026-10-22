import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { canonicalize, hashBriefing, conteudoCanonico, validateBriefing } from './briefing-contract.ts'

const dir = new URL('../../docs/verve/', import.meta.url)
const exemplo = JSON.parse(readFileSync(new URL('briefing-exemplo.json', dir), 'utf8'))
const canon = readFileSync(new URL('briefing-exemplo.canonico.txt', dir), 'utf8')
const hash = readFileSync(new URL('briefing-exemplo.sha256', dir), 'utf8').trim()

test('vetor do contrato: canônico e hash iguais aos gerados pelo ATLAS (Python)', () => {
  assert.equal(conteudoCanonico(exemplo), canon)
  assert.equal(hashBriefing(exemplo), hash)
})
test('o hash só cobre o conteúdo: id, status e datas não entram', () => {
  assert.equal(hashBriefing({ ...exemplo, id: 'x', status: 'aprovado', created_at: 'hoje' }), hash)
})
test('mudar qualquer campo de conteúdo muda o hash', () => {
  assert.notEqual(hashBriefing({ ...exemplo, titulo: exemplo.titulo + '.' }), hash)
  const p = JSON.parse(JSON.stringify(exemplo)); p.plano_semana[0].hora = '10:00'
  assert.notEqual(hashBriefing(p), hash)
})
test('canonicalize ordena chaves e preserva acentos', () => {
  assert.equal(canonicalize({ b: 1, a: { d: 'é', c: [2, 1] } }), '{"a":{"c":[2,1],"d":"é"},"b":1}')
})
test('o exemplo é válido', () => {
  assert.deepEqual(validateBriefing(exemplo), [])
})
test('campos obrigatórios e limites', () => {
  const e = validateBriefing({})
  for (const k of ['titulo', 'objetivo', 'publico_alvo', 'pilar', 'indicadores', 'plano_semana']) assert.ok(e.includes(k), k)
  const p = JSON.parse(JSON.stringify(exemplo))
  p.plano_semana[0].slides = p.plano_semana[0].slides.slice(0, 2)
  assert.ok(validateBriefing(p).includes('plano_semana[0].slides'))
  const q = JSON.parse(JSON.stringify(exemplo)); q.plano_semana[0].revisao_necessaria = false
  assert.ok(validateBriefing(q).includes('plano_semana[0].revisao_necessaria'))
  const g = JSON.parse(JSON.stringify(exemplo)); g.gatilho_manychat.palavra = 'menopausa'
  assert.ok(validateBriefing(g).includes('gatilho_manychat'))
  const t = JSON.parse(JSON.stringify(exemplo)); t.plano_semana[0].tipo = 'reel'
  assert.ok(validateBriefing(t).includes('plano_semana[0].slides'))
})
test('publicidade médica bloqueia o briefing', () => {
  const p = JSON.parse(JSON.stringify(exemplo))
  p.plano_semana[0].legenda = 'Cura garantida da menopausa! Só R$ 199.'
  const e = validateBriefing(p)
  assert.ok(e.some(x => x.includes('publicidade_medica:promessa de cura')))
  assert.ok(e.some(x => x.includes('publicidade_medica:preço ou promoção')))
})
