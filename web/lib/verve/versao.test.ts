import test from 'node:test'
import assert from 'node:assert/strict'
import { validarPedidoVersao, tituloDaVersao, podeCriarVersao, MAX_VERSOES_POR_DIA } from './versao.ts'

const slides = [
  { titulo: 'Menopausa ou transição?', texto: 'Entenda a diferença e saiba o que observar.', papel: 'capa' },
  { titulo: 'Qual é a diferença?', papel: 'comparacao', colunas: [{ titulo: 'Transição', texto: 'Ciclo irregular, ainda com menstruação.' }, { titulo: 'Menopausa', texto: '12 meses seguidos sem menstruar.' }] },
  { titulo: 'O que observar', papel: 'checklist', itens: ['Mudanças no ciclo', 'Alterações do sono', 'Ondas de calor'] },
  { titulo: 'Percebeu alguma mudança?', texto: 'Converse com um médico para uma avaliação individual.', papel: 'fecho' },
]

test('pedido de versão válido recebe a assinatura do médico e mantém os papéis dos slides', () => {
  const p = validarPedidoVersao({ id_original: 'abc', legenda: 'Texto educativo.', slides, titulo: 'Menopausa ou transição?' })
  assert.equal(p.ok, true)
  if (p.ok) { assert.match(p.legenda, /CRM-SC 38765/); assert.equal(p.slides[1].papel, 'comparacao'); assert.equal(p.slides[2].itens?.length, 3) }
})

test('recusa pedido sem original, sem legenda, com slides fora do limite ou papel errado', () => {
  assert.deepEqual(validarPedidoVersao({}), { ok: false, erro: 'id_original_obrigatorio' })
  assert.deepEqual(validarPedidoVersao({ id_original: 'a' }), { ok: false, erro: 'legenda_obrigatoria' })
  assert.equal((validarPedidoVersao({ id_original: 'a', legenda: 'x', slides: [slides[0]] }) as { erro: string }).erro, 'slides_invalidos')
  const r = validarPedidoVersao({ id_original: 'a', legenda: 'x', slides: [slides[0], { titulo: 'x'.repeat(81) }, slides[3]] }) as { ok: false; detalhes: string[] }
  assert.ok(r.detalhes.some(d => d.startsWith('slide2:titulo')))
  const sem = validarPedidoVersao({ id_original: 'a', legenda: 'x', slides: [{ ...slides[0], papel: 'fecho' }, slides[3]] }) as { detalhes: string[] }
  assert.ok(sem.detalhes.includes('slide1:papel_deve_ser_capa'))
  const checklist = validarPedidoVersao({ id_original: 'a', legenda: 'x', slides: [slides[0], { titulo: 't', papel: 'checklist', itens: ['um'] }, slides[3]] }) as { detalhes: string[] }
  assert.ok(checklist.detalhes.some(d => d.includes('checklist_2_a_4')))
})

test('defesa de compliance no servidor: promessa, preço, antes e depois ou venda em qualquer texto barram o pedido', () => {
  const ruim = (alt: Record<string, unknown>) => validarPedidoVersao({ id_original: 'a', legenda: 'ok', slides, ...alt }) as { ok: boolean; erro?: string; detalhes?: string[] }
  assert.equal(ruim({ legenda: 'Tratamento garantido para a menopausa.' }).erro, 'reprovado_pelo_filtro_de_publicidade_medica')
  assert.ok(ruim({ slides: [slides[0], { ...slides[2], itens: ['Antes e depois real', 'b'] }, slides[3]] }).detalhes?.includes('antes e depois'))
  assert.ok(ruim({ titulo: 'Aproveite o desconto' }).detalhes?.includes('linguagem de venda'))
})

test('título da versão B e limite diário', () => {
  assert.equal(tituloDaVersao('Depois dos 40'), 'Depois dos 40 · versão B')
  assert.equal(tituloDaVersao('Depois dos 40', 'Menopausa ou transição?'), 'Menopausa ou transição? · versão B')
  assert.equal(tituloDaVersao('X · versão B'), 'X · versão B')
  assert.equal(podeCriarVersao(MAX_VERSOES_POR_DIA - 1), true); assert.equal(podeCriarVersao(MAX_VERSOES_POR_DIA), false)
})
