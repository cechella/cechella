import test from 'node:test'
import assert from 'node:assert/strict'
import { validarPedido, escolherAlvo } from './refoto.ts'

test('pedido de refoto: faixa, persona e instrução válidas; nada a mudar é recusado', () => {
  const p = validarPedido({ faixa: { min: 40, max: 60 }, persona: 'mulher_35_50', instrucao: ' warm light,  outdoor ' })
  assert.equal(p.ok, true)
  if (p.ok) { assert.deepEqual(p.opcoes.faixa, { min: 40, max: 60 }); assert.equal(p.opcoes.instrucao, 'warm light, outdoor'); assert.equal(p.opcoes.nova_pasta, true) }
  assert.deepEqual(validarPedido({}), { ok: false, erro: 'nada_a_mudar' })
  assert.deepEqual(validarPedido(null), { ok: false, erro: 'nada_a_mudar' })
})

test('pedido de refoto: rejeita faixa absurda, persona desconhecida, instrução longa ou imprópria', () => {
  assert.equal(validarPedido({ faixa: { min: 60, max: 40 } }).ok, false)
  assert.equal(validarPedido({ faixa: { min: 10, max: 20 } }).ok, false)
  assert.equal(validarPedido({ faixa: { min: '40', max: 60 } }).ok, false)
  assert.equal(validarPedido({ persona: 'crianca' }).ok, false)
  assert.deepEqual(validarPedido({ instrucao: 'x'.repeat(161) }), { ok: false, erro: 'instrucao_longa_demais' })
  assert.deepEqual(validarPedido({ instrucao: 'woman in lingerie' }), { ok: false, erro: 'instrucao_recusada' })
  assert.deepEqual(validarPedido({ instrucao: 'antes e depois' }), { ok: false, erro: 'instrucao_recusada' })
  assert.deepEqual(validarPedido({ id: '  ', faixa: { min: 40, max: 60 } }), { ok: false, erro: 'id_invalido' })
})

test('sem id, refaz o carrossel mais recente que ainda não foi ao ar', () => {
  const posts = [
    { id: 'a', status: 'publicado', tipo: 'carrossel', created_at: '2026-10-23T10:00:00Z' },
    { id: 'b', status: 'aguardando', tipo: 'carrossel', created_at: '2026-10-23T09:00:00Z' },
    { id: 'c', status: 'aprovado', tipo: 'carrossel', created_at: '2026-10-22T09:00:00Z' },
    { id: 'd', status: 'aguardando', tipo: 'reel', created_at: '2026-10-23T11:00:00Z' },
  ]
  assert.equal(escolherAlvo(posts), 'b')
  assert.equal(escolherAlvo([{ id: 'p', status: 'publicando', tipo: 'carrossel' }]), null)
})
