import test from 'node:test'
import assert from 'node:assert/strict'
import { valorMetrica, resumirMidia, diagnostico } from './insights.ts'

test('valorMetrica lê values (mídia) e total_value (conta); erro e ausência viram null com motivo, nunca zero', () => {
  assert.deepEqual(valorMetrica({ data: [{ name: 'reach', values: [{ value: 1234 }] }] }), { valor: 1234 })
  assert.deepEqual(valorMetrica({ data: [{ name: 'reach', total_value: { value: 0 } }] }), { valor: 0 })          // zero real é zero
  assert.equal(valorMetrica({ error: { message: 'permissão ausente' } }).valor, null)
  assert.equal(valorMetrica({ error: { message: 'permissão ausente' } }).erro, 'permissão ausente')
  assert.equal(valorMetrica({ data: [] }).valor, null)
  assert.equal(valorMetrica(null).valor, null)
  assert.equal(valorMetrica({ data: [{ name: 'x', values: [{ value: 'abc' }] }] }).valor, null)
})

test('resumirMidia corta a legenda, mantém nulos e liga ao post do sistema', () => {
  const r = resumirMidia({ id: '1', caption: 'a '.repeat(200), media_product_type: 'FEED', like_count: 5 }, { reach: { valor: 10 } }, { id: 'p1', titulo: 'T' })
  assert.equal(r.legenda_inicio.length <= 160, true)
  assert.equal(r.curtidas, 5)
  assert.equal(r.comentarios, null)
  assert.equal(r.post?.titulo, 'T')
  assert.equal(resumirMidia({ id: '2' }, {}, null).post, null)
})

test('diagnóstico separa leitura de insights', () => {
  const d = diagnostico(true, [{ valor: null, erro: 'sem permissão' }, { valor: null, erro: 'sem permissão' }])
  assert.equal(d.leitura_ok, true)
  assert.equal(d.insights_ok, false)
  assert.deepEqual(d.erros, ['sem permissão'])
  assert.equal(diagnostico(true, [{ valor: 3 }, { valor: null, erro: 'x' }]).insights_ok, true)
})
