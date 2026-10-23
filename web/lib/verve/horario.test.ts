import test from 'node:test'
import assert from 'node:assert/strict'
import { emBrasilia } from './horario.ts'

test('horário em Brasília a partir de UTC e de offset explícito', () => {
  assert.deepEqual(emBrasilia('2026-10-26T18:00:00+00:00'), { data: '2026-10-26', hora: '15:00' })
  assert.deepEqual(emBrasilia('2026-10-26T15:00:00-03:00'), { data: '2026-10-26', hora: '15:00' })
  assert.deepEqual(emBrasilia('2026-10-27T01:30:00Z'), { data: '2026-10-26', hora: '22:30' })   // vira o dia para trás
  assert.deepEqual(emBrasilia('lixo'), { data: '', hora: '' })
  assert.deepEqual(emBrasilia(undefined), { data: '', hora: '' })
})
