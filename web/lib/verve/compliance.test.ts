import test from 'node:test'
import assert from 'node:assert/strict'
import { complianceViolations } from './compliance.ts'

test('texto educativo passa', () => {
  assert.deepEqual(complianceViolations('A queda de estrogênio pode afetar o sono e o humor. Converse com um médico para uma avaliação individual.'), [])
})
test('barra promessa, preço e antes e depois', () => {
  const t = 'Cura garantida em 30 dias! Antes e depois reais. Só R$ 199 com desconto. 100% sem efeitos colaterais.'
  const v = complianceViolations(t)
  for (const k of ['promessa de cura', 'promessa de resultado', 'antes e depois', 'preço ou promoção', 'percentual absoluto', 'omite riscos']) assert.ok(v.includes(k), k)
})
test('não confunde palavras parecidas', () => {
  assert.deepEqual(complianceViolations('O acúmulo de cuidado diário e a curadoria de hábitos ajudam.'), [])
})
