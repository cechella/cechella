import test from 'node:test'
import assert from 'node:assert/strict'
import { avaliarAprovacao, MAX_APROVACOES_POR_DIA } from './aprovacao.ts'

const jpg = (n: number) => Array.from({ length: n }, (_, i) => `https://x.public.blob.vercel-storage.com/s${i}.jpg`)
const BOM = { status: 'aguardando', tipo: 'carrossel', image_urls: jpg(6), titulo: 'Menopausa', legenda: 'Entenda o que muda.\n\nDr. Vinícius Cechella Borba · MÉDICO · CRM-SC 38765\n#menopausa #saude' }
const AGORA = new Date('2026-10-28T20:00:00Z')

test('post íntegro e sem horário: aprova para daqui a 3 min', () => {
  const d = avaliarAprovacao(BOM, 'agora', AGORA, 0)
  assert.equal(d.ok, true); assert.equal(d.scheduled_at, '2026-10-28T20:03:00.000Z')
})

test('mantém o horário já marcado se for futuro; passado vira agora', () => {
  assert.equal(avaliarAprovacao(BOM, undefined, AGORA, 0, '2026-10-29T12:00:00Z').scheduled_at, '2026-10-29T12:00:00.000Z')
  assert.equal(avaliarAprovacao(BOM, undefined, AGORA, 0, '2026-10-20T12:00:00Z').scheduled_at, '2026-10-28T20:03:00.000Z')
})

test('cada trava barra sozinha', () => {
  const casos: Array<[Record<string, unknown>, string]> = [
    [{ status: 'publicado' }, 'status_publicado_nao_aprovavel'], [{ status: 'aprovado' }, 'status_aprovado_nao_aprovavel'],
    [{ image_urls: [] }, 'sem_imagem'], [{ image_urls: jpg(1) }, 'carrossel_precisa_de_2_a_10_imagens'],
    [{ legenda: 'Texto sem assinatura do médico aqui.' }, 'falta_identificacao_do_medico'],
    [{ legenda: 'Cura garantida! Dr. Vinícius · MÉDICO · CRM-SC 38765' }, 'publicidade_medica:promessa de cura'],
    [{ legenda: 'Texto longo. ' + 'a'.repeat(2300) + ' MÉDICO 38765' }, 'legenda_acima_de_2200'],
    [{ legenda: 'Oi tudo bem aqui. MÉDICO 38765 #a #b #c #d #e #f' }, 'mais_de_5_hashtags'],
  ]
  for (const [mut, esperado] of casos) {
    const d = avaliarAprovacao({ ...BOM, ...mut }, 'agora', AGORA, 0)
    assert.equal(d.ok, false, esperado); assert.ok(d.problemas.includes(esperado), `${esperado} em ${d.problemas}`)
  }
})

test('limite diário e horários inválidos', () => {
  assert.ok(avaliarAprovacao(BOM, 'agora', AGORA, MAX_APROVACOES_POR_DIA).problemas.includes('limite_diario_de_aprovacoes'))
  assert.ok(avaliarAprovacao(BOM, 'lixo', AGORA, 0).problemas.includes('horario_invalido'))
  assert.ok(avaliarAprovacao(BOM, '2026-10-01T00:00:00Z', AGORA, 0).problemas.includes('horario_no_passado'))
  assert.ok(avaliarAprovacao(BOM, '2027-01-01T00:00:00Z', AGORA, 0).problemas.includes('horario_alem_de_14_dias'))
  assert.equal(avaliarAprovacao(BOM, '2026-10-29T15:00:00-03:00', AGORA, 0).ok, true)
})
