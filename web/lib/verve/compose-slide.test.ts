import test from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { composeSlide } from './compose-slide.ts'

// Regressão: as fontes eram WOFF2 baixadas da rede e o satori não as lê; toda composição falhava e o carrossel saía sem texto (ou sem imagem).
test('compõe o slide com texto sobre a foto (sem rede) e converte para JPEG', async () => {
  const foto = await sharp({ create: { width: 1080, height: 1350, channels: 3, background: { r: 90, g: 80, b: 70 } } }).jpeg().toBuffer()
  const png = await composeSlide({
    titulo: 'Cansaço, baixa libido, ganho de gordura e irritabilidade?',
    descricao: 'Esses sintomas merecem atenção, mas não significam, por si só, testosterona baixa.',
    badge: 'PARA HOMENS DE 40 A 60 ANOS',
    slideNum: 1, totalSlides: 8, imageBuffer: foto,
  })
  const meta = await sharp(png).metadata()
  assert.equal(meta.format, 'png')
  assert.equal(meta.width, 1080)
  assert.equal(meta.height, 1350)
  const jpeg = await sharp(png).jpeg({ quality: 92, mozjpeg: true }).toBuffer()
  assert.equal((await sharp(jpeg).metadata()).format, 'jpeg')
  // O slide composto tem que diferir da foto de fundo (tem texto, gradiente e assinatura desenhados).
  assert.notDeepEqual(await sharp(foto).resize(108, 135).raw().toBuffer(), await sharp(png).resize(108, 135).raw().toBuffer())
  if (process.env.SAVE_SLIDE) writeFileSync(process.env.SAVE_SLIDE, jpeg)
})
