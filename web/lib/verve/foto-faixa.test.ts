import test from 'node:test'
import assert from 'node:assert/strict'
import { detectFaixa, idadeDoSlide, FAIXA_PADRAO } from './persona.ts'
import { buildPhotoPrompt, descricaoPessoa } from './generate-photo.ts'
import { buildBadge } from './render-slide.ts'

test('faixa etária vem do briefing: "40 a 60 anos", com traço ou "e"; sem faixa, 40 a 60', () => {
  assert.deepEqual(detectFaixa('Mulheres brasileiras de 40 a 60 anos'), { min: 40, max: 60 })
  assert.deepEqual(detectFaixa('Mulheres 45-55 anos', ''), { min: 45, max: 55 })
  assert.deepEqual(detectFaixa(undefined, 'Educar sobre menopausa'), FAIXA_PADRAO)
  assert.deepEqual(detectFaixa('de 10 a 20 anos'), FAIXA_PADRAO)   // fora do plausível: não confia
})

test('idade do slide fica dentro da faixa e varia entre slides', () => {
  const idades = [0, 1, 2, 3].map(i => idadeDoSlide({ min: 40, max: 60 }, i))
  assert.ok(idades.every(a => a >= 40 && a <= 60))
  assert.ok(new Set(idades).size > 1)
})

test('o prompt da foto pede mulher de 40 a 60 com sinais de idade, nunca "jovem"', () => {
  for (let i = 0; i < 4; i++) {
    const p = buildPhotoPrompt({ tema: 'menopausa', pilar: 'autoridade', persona: 'mulher_35_50', faixa: { min: 40, max: 60 }, indice: i })
    assert.match(p, /Brazilian woman aged (4\d|5\d|60)/)
    assert.match(p, /not a young model/)
    assert.doesNotMatch(p, /\b(young woman|20s|30s)\b/)
  }
  assert.match(descricaoPessoa('homem_40_60', { min: 40, max: 60 }, 0), /Brazilian man aged/)
})

test('o selo do slide 1 mostra a faixa do briefing', () => {
  assert.equal(buildBadge('mulher_35_50', 'autoridade', { min: 40, max: 60 }), 'PARA MULHERES DE 40 A 60 ANOS')
  assert.equal(buildBadge('homem_40_60', 'autoridade'), 'PARA HOMENS DE 40 A 60 ANOS')
  assert.equal(buildBadge('mulher_35_50', 'familia'), 'FAMÍLIA')
})
