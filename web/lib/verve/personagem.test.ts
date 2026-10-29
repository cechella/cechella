import test from 'node:test'
import assert from 'node:assert/strict'
import { idadeDoPersonagem, descricaoPersonagem, cenaDoSlide, promptDoSlide, promptComReferencia, sementeDoPost } from './personagem.ts'

const F = { min: 40, max: 60 }

test('uma idade só por carrossel, na parte de baixo da faixa (48 para 40 a 60)', () => {
  assert.equal(idadeDoPersonagem(F), 48)
  assert.equal(idadeDoPersonagem({ min: 45, max: 55 }), 49)
})

test('a personagem é bonita e brasileira, nunca dura, abatida ou envelhecida', () => {
  const m = descricaoPersonagem('mulher_35_50', F)
  assert.match(m, /beautiful Brazilian woman aged 48/); assert.match(m, /radiant healthy glowing skin/); assert.match(m, /looks great for her age/)
  assert.doesNotMatch(m, /wrinkled|haggard|elderly|not a young model|gray hair/i)
  assert.match(descricaoPersonagem('homem_40_60', F), /handsome distinguished Brazilian man aged 48/)
})

test('o roteiro tem abertura, miolo por tema e consulta, sem cenas de exaustão ou sofrimento', () => {
  assert.match(cenaDoSlide(0, 4, 'qualquer', 'mulher_35_50'), /hero portrait/)
  assert.match(cenaDoSlide(3, 4, 'qualquer', 'mulher_35_50'), /doctor's consultation/)
  for (const tema of ['cansaço e baixa energia', 'libido', 'ganho de gordura', 'irritabilidade', 'sono', 'exames', 'outro assunto']) {
    const c = cenaDoSlide(1, 4, tema, 'mulher_35_50')
    assert.doesNotMatch(c, /tired|exhausted|fatigued|stressed|hands on temples|restless|distant/i, tema)
  }
})

test('os slides do miolo partem da foto de referência (mesma pessoa); a abertura parte do texto', () => {
  const ref = promptComReferencia({ persona: 'mulher_35_50', indice: 1, total: 4, tema: 'sono' })
  assert.match(ref, /exact same woman as in the reference photo/); assert.match(ref, /resting peacefully/)
  const abertura = promptDoSlide({ persona: 'mulher_35_50', faixa: F, indice: 0, total: 4, tema: 'x', pilar: 'autoridade' })
  assert.match(abertura, /beautiful Brazilian woman/); assert.match(abertura, /no text, no watermark/)
})

test('a instrução do CEO entra como direção de arte em todos os slides', () => {
  assert.match(promptDoSlide({ persona: 'mulher_35_50', faixa: F, indice: 0, total: 4, tema: 'x', pilar: 'autoridade', instrucao: 'warm outdoor light' }), /art direction: warm outdoor light/)
  assert.match(promptComReferencia({ persona: 'mulher_35_50', indice: 1, total: 4, tema: 'x', instrucao: 'warm outdoor light' }), /art direction: warm outdoor light/)
})

test('a semente é estável por post e muda entre posts', () => {
  assert.equal(sementeDoPost('abc'), sementeDoPost('abc')); assert.notEqual(sementeDoPost('abc'), sementeDoPost('abd'))
  assert.ok(sementeDoPost('abc') > 0)
})
