import test from 'node:test'
import assert from 'node:assert/strict'
import { detectPersona } from './persona.ts'

test('persona: homens, andropausa e testosterona são público masculino; o resto é feminino', () => {
  assert.equal(detectPersona('Homens de 40 a 60 anos com dúvidas sobre cansaço'), 'homem_40_60')
  assert.equal(detectPersona('', 'Andropausa: sintomas'), 'homem_40_60')
  assert.equal(detectPersona('', '', 'queda de testosterona'), 'homem_40_60')
  assert.equal(detectPersona('Mulheres de 35 a 50 anos', 'Menopausa aos 40?'), 'mulher_35_50')
  assert.equal(detectPersona(undefined, undefined, undefined), 'mulher_35_50')
})
