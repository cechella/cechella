import test from 'node:test'
import assert from 'node:assert/strict'
import { grupoTeste, calcularMetricas, trechosPorEtapa, parseTecnicas, parseAnalise, type LeadResumo } from './core.ts'

test('grupo de teste é estável e ignora formatação/prefixo 55', () => {
  const g = grupoTeste('5548988416899')
  assert.equal(grupoTeste('+55 (48) 98841-6899'), g)
  assert.equal(grupoTeste('48988416899'), g)
  const grupos = new Set(Array.from({ length: 50 }, (_, i) => grupoTeste(`55479900000${String(i).padStart(2, '0')}`)))
  assert.deepEqual([...grupos].sort(), ['A', 'B'])
})

test('métricas: conversão geral, por grupo e onde param', () => {
  const leads: LeadResumo[] = [
    { id: '1', telefone: '5547990000001', etapa_agente: 7, status_pagamento: 'pago', historico: [] },
    { id: '2', telefone: '5547990000002', etapa_agente: 4, status_pagamento: null, historico: [] },
    { id: '3', telefone: '5547990000003', etapa_agente: 4, status_pagamento: 'pendente', historico: [] },
    { id: '4', telefone: '5547990000004', etapa_agente: null, status_pagamento: null, historico: [] },
  ]
  const m = calcularMetricas(leads)
  assert.equal(m.total_leads, 4)
  assert.equal(m.pagos, 1)
  assert.equal(m.conversao, 25)
  assert.deepEqual(m.parados_por_etapa, { '4': 2, '1': 1 })
  assert.equal(m.grupos.A.leads + m.grupos.B.leads, 4)
  assert.equal(calcularMetricas([]).conversao, 0)
})

test('trechos por etapa ignoram mensagens sem etapa e limitam tamanho', () => {
  const h = [
    { role: 'assistant', content: 'antigo sem etapa' },
    { role: 'user', content: 'oi', etapa: 1 },
    { role: 'assistant', content: 'olá', etapa: 1 },
    ...Array.from({ length: 10 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `m${i}`, etapa: 5 })),
    { role: 'system', content: 'x', etapa: 5 },
  ]
  const t = trechosPorEtapa(h, 8)
  assert.deepEqual([...t.keys()].sort(), [1, 5])
  assert.equal(t.get(1)!.length, 2)
  assert.equal(t.get(5)!.length, 8)
  assert.equal(t.get(5)!.at(-1)!.content, 'm9')
  assert.equal(trechosPorEtapa(null).size, 0)
})

test('parseTecnicas aceita texto ao redor, descarta inválidos e normaliza etapa', () => {
  const r = parseTecnicas('Aqui está:\n[{"titulo":"Isolar preço","conteudo":"Pergunte...","etapa":5,"situacao":"Preco"},{"titulo":"","conteudo":"x"},{"titulo":"Geral","conteudo":"y","etapa":12}]')
  assert.equal(r.length, 2)
  assert.deepEqual(r[0], { titulo: 'Isolar preço', conteudo: 'Pergunte...', etapa: 5, situacao: 'preco' })
  assert.equal(r[1].etapa, null)
  assert.deepEqual(parseTecnicas('sem json'), [])
})

test('parseAnalise mantém justificativa alinhada mesmo com sugestão inválida no meio', () => {
  const a = parseAnalise('{"analise":"ok","sugestoes":[{"titulo":"A","conteudo":"a","justificativa":"ja"},{"titulo":""},{"titulo":"C","conteudo":"c","justificativa":"jc"}]}')
  assert.equal(a.analise, 'ok')
  assert.deepEqual(a.sugestoes.map(s => [s.titulo, s.justificativa]), [['A', 'ja'], ['C', 'jc']])
  assert.equal(parseAnalise('texto livre').analise, 'texto livre')
})
