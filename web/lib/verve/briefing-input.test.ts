import test from 'node:test'
import assert from 'node:assert/strict'
import { validateBriefingInput } from './briefing-input.ts'

const ok = () => ({
  titulo: 'Semana da menopausa', objetivo: 'Educar mulheres de 35 a 50 anos sobre queda de estrogênio.', publico_alvo: 'Mulheres 35-50', pilar: 'autoridade',
  gatilho_manychat: 'MENOPAUSA', semana: '2026-W44',
  posts: [{ tipo: 'carrossel', tema: '4 sinais ligados à queda de estrogênio', pilar: 'autoridade', scheduled_at: '2026-10-26T09:00:00-03:00' }],
})

test('formato da Hormone válido', () => {
  const r = validateBriefingInput(ok())
  assert.equal(r.ok, true)
})
test('campos obrigatórios e limites', () => {
  const r = validateBriefingInput({}) as { ok: false; erros: string[] }
  for (const k of ['titulo', 'objetivo', 'semana', 'posts']) assert.ok(r.erros.includes(k), k)
  const b = ok(); b.posts[0].tipo = 'podcast'; b.posts[0].scheduled_at = '26/10 9h'; b.semana = '2026-44'; b.gatilho_manychat = 'menopausa'
  const e = (validateBriefingInput(b) as { ok: false; erros: string[] }).erros
  for (const k of ['posts[0].tipo', 'posts[0].scheduled_at', 'semana', 'gatilho_manychat']) assert.ok(e.includes(k), k)
})
test('mais de 14 posts é recusado', () => {
  const b = ok(); b.posts = Array.from({ length: 15 }, () => ({ ...ok().posts[0] }))
  assert.ok((validateBriefingInput(b) as { ok: false; erros: string[] }).erros.includes('posts'))
})
test('publicidade médica bloqueia título, tema e legenda', () => {
  const b = ok(); b.posts[0].legenda = 'Cura garantida! Só R$ 99.'; b.titulo = 'Antes e depois reais'
  const e = (validateBriefingInput(b) as { ok: false; erros: string[] }).erros
  assert.ok(e.some(x => x.includes('promessa de cura')))
  assert.ok(e.some(x => x.includes('antes e depois')))
  assert.ok(e.some(x => x.includes('preço ou promoção')))
})
test('só devolve os campos conhecidos; status e quem criou não vêm do corpo', () => {
  const r = validateBriefingInput({ ...ok(), status: 'aprovado', criado_por: 'ceo', id: 'x' })
  assert.equal(r.ok, true)
  const v = (r as { ok: true; value: Record<string, unknown> }).value
  for (const k of ['status', 'criado_por', 'id']) assert.equal(k in v, false, k)
})
