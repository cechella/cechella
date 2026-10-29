import test from 'node:test'
import assert from 'node:assert/strict'
import { legendaRecolhida, contarHashtags, resumoPreview, LIMITE_FEED } from './preview-legenda.ts'

test('legenda curta aparece inteira; longa é cortada perto de 125 caracteres, em palavra inteira', () => {
  assert.deepEqual(legendaRecolhida('Curta.'), { visivel: 'Curta.', cortou: false })
  const longa = 'Passou dos 40 e percebeu mudanças no ciclo ou no sono? Isso não permite concluir, por si só, que você está na menopausa. A menopausa natural é reconhecida após 12 meses.'
  const r = legendaRecolhida(longa)
  assert.equal(r.cortou, true); assert.ok(r.visivel.length <= LIMITE_FEED); assert.ok(longa.startsWith(r.visivel)); assert.match(r.visivel, /menopausa\.?$|por si só, que você está na$|\w$/)
  assert.doesNotMatch(r.visivel, /\s$/)
})

test('com quebra de linha antes do limite, o feed mostra só a primeira linha', () => {
  const r = legendaRecolhida('Primeira linha curta.\n\n' + 'Resto da legenda que o público só vê tocando em mais. '.repeat(4))
  assert.deepEqual(r, { visivel: 'Primeira linha curta.', cortou: true })
  assert.deepEqual(legendaRecolhida('Linha.\n'), { visivel: 'Linha.\n', cortou: false })
})

test('conta hashtags com acento', () => {
  assert.equal(contarHashtags('texto #menopausa #saúde_da_mulher #40mais fim'), 3)
  assert.equal(contarHashtags(''), 0)
})

test('avisos de fidelidade: sem legenda, legenda grande, hashtags demais, carrossel fora de 2 a 10', () => {
  assert.deepEqual(resumoPreview({ tipo: 'carrossel', legenda: 'ok', image_urls: ['a', 'b', 'c', 'd'] }).avisos, [])
  assert.match(resumoPreview({ tipo: 'carrossel', legenda: '  ', image_urls: ['a', 'b'] }).avisos[0], /SEM legenda/)
  assert.match(resumoPreview({ tipo: 'carrossel', legenda: 'x'.repeat(2201), image_urls: ['a', 'b'] }).avisos[0], /2201 caracteres.*2200/)
  assert.match(resumoPreview({ tipo: 'carrossel', legenda: Array.from({ length: 31 }, (_, i) => '#t' + i).join(' '), image_urls: ['a', 'b'] }).avisos[0], /31 hashtags/)
  assert.match(resumoPreview({ tipo: 'carrossel', legenda: 'ok', image_urls: ['a'] }).avisos[0], /2 a 10 imagens \(este tem 1\)/)
  const r = resumoPreview({ tipo: 'carrossel', legenda: 'abc #x', image_urls: ['a', '', 'b'] }); assert.deepEqual([r.slides, r.caracteres, r.hashtags], [2, 6, 1])
})
