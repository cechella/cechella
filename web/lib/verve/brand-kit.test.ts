import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { papelDoSlide, tamanhosDeTexto, KIT, CHIPS_FECHO } from './brand-kit.ts'
import { composeSlide } from './compose-slide.ts'

test('papéis do slide: capa, miolo e fecho (o último ou o marcado como CTA)', () => {
  assert.equal(papelDoSlide(1, 4), 'capa'); assert.equal(papelDoSlide(2, 4), 'conteudo'); assert.equal(papelDoSlide(4, 4), 'fecho')
  assert.equal(papelDoSlide(2, 4, true), 'fecho'); assert.equal(papelDoSlide(1, 1), 'capa')
})

test('texto legível no celular: títulos e descrições longos encolhem, nunca abaixo do mínimo', () => {
  assert.deepEqual(tamanhosDeTexto('Curto', 'Curta.'), { titulo: 64, descricao: 38 })
  const longo = tamanhosDeTexto('x'.repeat(80), 'y'.repeat(250))
  assert.deepEqual(longo, { titulo: 50, descricao: 31 })
  assert.ok(longo.titulo >= 48 && longo.descricao >= 30)
})

test('o kit tem a marca fixa e o fecho pede salvar e enviar, sem prometer resultado', () => {
  assert.equal(KIT.cores.destaque, '#C9A96E')
  assert.deepEqual(CHIPS_FECHO, ['SALVE PARA RELER', 'ENVIE A QUEM PRECISA'])
  assert.doesNotMatch(CHIPS_FECHO.join(' '), /cura|resultado|garant|trat/i)
})

test('renderiza capa, miolo e fecho no kit de marca (1080x1350) e o layout clássico continua disponível', async () => {
  const foto = await sharp({ create: { width: 1080, height: 1350, channels: 3, background: { r: 120, g: 100, b: 90 } } }).jpeg().toBuffer()
  const base = { imageBuffer: foto, totalSlides: 4 }
  const capa = await composeSlide({ ...base, titulo: 'Depois dos 40, toda mudança é menopausa?', descricao: 'Não. A idade, sozinha, não define a menopausa.', badge: 'Para mulheres de 40 a 60 anos', slideNum: 1 })
  const miolo = await composeSlide({ ...base, titulo: 'Menopausa e transição não são a mesma coisa', descricao: 'A menopausa natural é reconhecida após 12 meses.', slideNum: 2 })
  const fecho = await composeSlide({ ...base, titulo: 'Percebeu alguma mudança?', descricao: 'Converse com um médico.', slideNum: 4, isCta: true })
  const classico = await composeSlide({ ...base, titulo: 'Clássico', slideNum: 1, layout: 'classico' })
  for (const png of [capa, miolo, fecho, classico]) { const m = await sharp(png).metadata(); assert.deepEqual([m.format, m.width, m.height], ['png', 1080, 1350]) }
  const raw = async (b: Buffer) => sharp(b).resize(54, 68).raw().toBuffer()
  assert.notDeepEqual(await raw(capa), await raw(miolo))      // a capa (selo e seta) difere do miolo
  assert.notDeepEqual(await raw(miolo), await raw(fecho))     // o fecho (chips) difere do miolo
  assert.notDeepEqual(await raw(capa), await raw(classico))   // o kit difere do layout antigo
})
