import test from 'node:test'
import assert from 'node:assert/strict'
import { classificar, publishAuthorized, problemaDoPost } from './publish-core.ts'

const h = (v: string | null) => ({ get: (n: string) => (n.toLowerCase() === 'authorization' ? v : null) })
const T = 'a'.repeat(40)

test('janela: só publica de 2 min antes até 6 h depois do horário', () => {
  const agora = new Date('2026-10-26T18:00:00Z')
  assert.equal(classificar('2026-10-26T15:00:00-03:00', agora), 'agora')       // exatamente na hora
  assert.equal(classificar('2026-10-26T15:01:00-03:00', agora), 'agora')       // 1 min no futuro: dentro da antecedência
  assert.equal(classificar('2026-10-26T15:10:00-03:00', agora), 'cedo')
  assert.equal(classificar('2026-10-26T09:00:00-03:00', agora), 'agora')       // 3 h de atraso
  assert.equal(classificar('2026-10-25T09:00:00-03:00', agora), 'atrasado')    // dias de atraso: não publica sozinho
  assert.equal(classificar('lixo', agora), 'invalido')
  assert.equal(classificar(undefined, agora), 'invalido')
})

test('token do agendador: dedicado, longo e comparado por inteiro', () => {
  assert.equal(publishAuthorized(T, h(`Bearer ${T}`)), true)
  assert.equal(publishAuthorized(T, h(`Bearer ${T}x`)), false)
  assert.equal(publishAuthorized(T, h(T)), false)
  assert.equal(publishAuthorized(T, h(null)), false)
  assert.equal(publishAuthorized(undefined, h(`Bearer ${T}`)), false)
  assert.equal(publishAuthorized('curto', h('Bearer curto')), false)
})

test('pré-condições do post: imagem, https, carrossel de 2 a 10 em JPEG', () => {
  const jpg = (n: number) => Array.from({ length: n }, (_, i) => `https://x.public.blob.vercel-storage.com/s${i}.jpg`)
  assert.equal(problemaDoPost({ tipo: 'carrossel', image_urls: jpg(8) }), null)
  assert.equal(problemaDoPost({ tipo: 'carrossel', image_urls: [] }), 'sem_imagem')
  assert.equal(problemaDoPost({ tipo: 'carrossel', image_urls: jpg(1) }), 'carrossel_precisa_de_2_a_10_imagens')
  assert.equal(problemaDoPost({ tipo: 'carrossel', image_urls: jpg(11) }), 'carrossel_precisa_de_2_a_10_imagens')
  assert.equal(problemaDoPost({ tipo: 'carrossel', image_urls: ['http://x/a.jpg', 'https://x/b.jpg'] }), 'url_de_imagem_invalida')
  assert.equal(problemaDoPost({ tipo: 'carrossel', image_urls: ['https://x/a.png', 'https://x/b.png'] }), 'imagem_nao_e_jpeg')
})
