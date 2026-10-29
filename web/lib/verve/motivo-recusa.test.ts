import test from 'node:test'
import assert from 'node:assert/strict'
import { validarMotivo, montarMotivo, lerMotivo } from './motivo-recusa.ts'

test('motivo válido: aspectos conhecidos, sem repetição, texto limpo e limitado', () => {
  assert.deepEqual(validarMotivo({ aspectos: ['foto', 'foto', 'texto', 'banana'], texto: '  fotos\nmuito   feias ' }), { aspectos: ['foto', 'texto'], texto: 'fotos muito feias' })
  assert.deepEqual(validarMotivo({ aspectos: [], texto: 'só texto livre' }), { aspectos: [], texto: 'só texto livre' })
  assert.equal(validarMotivo({ aspectos: ['x'] }), null); assert.equal(validarMotivo(null), null); assert.equal(validarMotivo({ texto: 'x'.repeat(500), aspectos: ['foto'] })?.texto?.length, 200)
})

test('ida e volta pelo campo error_msg; mensagens de outro tipo não são motivo', () => {
  const m = { aspectos: ['foto', 'gancho'] as const, texto: 'capa fraca | e foto dura' }
  const s = montarMotivo({ aspectos: [...m.aspectos], texto: m.texto })
  assert.match(s, /^recusa:foto,gancho\|/); assert.deepEqual(lerMotivo(s), { aspectos: ['foto', 'gancho'], texto: 'capa fraca | e foto dura' })
  assert.equal(lerMotivo('render_tentativas=2: geracao_incompleta'), null); assert.equal(lerMotivo(null), null); assert.equal(lerMotivo('recusa:|'), null)
})
