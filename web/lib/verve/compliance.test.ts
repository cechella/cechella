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

test('escopo educativo: implante, chip da beleza, esteroide/anabolizante e seus nomes são barrados', () => {
  for (const t of ['Conheça o implante hormonal', 'o chip da beleza muda tudo', 'Chips hormonais para mulheres', 'esteroides anabolizantes', 'uso de gestrinona', 'oxandrolona e trembolona', 'efeito anabólico']) {
    const v = complianceViolations(t)
    assert.ok(v.some(x => x.startsWith('fora do escopo')), t + ' -> ' + v.join(','))
  }
})
test('linguagem de venda e urgência são barradas', () => {
  for (const t of ['Últimas vagas!', 'vagas limitadas', 'Garanta já a sua consulta', 'Aproveite a oferta', 'corra']) {
    assert.ok(complianceViolations(t).includes('linguagem de venda'), t)
  }
})
test('conteúdo educativo sobre menopausa passa', () => {
  const t = 'A menopausa marca o fim dos ciclos menstruais e a queda do estrogênio pode afetar sono, humor, articulações e retenção de líquidos. ' +
    'Cada mulher vive essa fase de um jeito. Converse com um médico para uma avaliação individual. Este conteúdo é educativo.'
  assert.deepEqual(complianceViolations(t), [])
})
test('o texto das regras para a IA traz o escopo', async () => {
  const { COMPLIANCE_RULES_PT, ESCOPO_PT } = await import('./compliance.ts')
  assert.ok(COMPLIANCE_RULES_PT.includes(ESCOPO_PT))
  for (const k of ['somente conteúdo EDUCATIVO', 'menopausa', 'implante hormonal', 'esteroides']) assert.ok(ESCOPO_PT.includes(k), k)
})

test('reposição hormonal pode ser citada de forma educativa (não é barrada) e o escopo diz como', async () => {
  const { ESCOPO_PT } = await import('./compliance.ts')
  assert.deepEqual(complianceViolations('A terapia de reposição hormonal é uma opção que existe e a indicação é individual e médica.'), [])
  for (const k of ['Terapia/reposição hormonal só pode ser citada de forma educativa', 'sem dose, marca', 'indicar tratamento específico']) assert.ok(ESCOPO_PT.includes(k), k)
})
test('assinatura obrigatória: CRM do CEO é acrescentado uma única vez, sem inventar RQE', async () => {
  const { comAssinatura, ASSINATURA_MEDICO } = await import('./compliance.ts')
  const a = comAssinatura('Texto educativo.')
  assert.ok(a.endsWith(ASSINATURA_MEDICO))
  assert.equal(comAssinatura(a), a)
  assert.ok(ASSINATURA_MEDICO.includes('CRM 38765/SC'))
  assert.ok(!/RQE/.test(ASSINATURA_MEDICO))
})
