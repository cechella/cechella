import test from 'node:test'
import assert from 'node:assert/strict'
import { decideAdmin, cronAuthorized } from './admin-core.ts'

const h = (o: Record<string, string>) => ({ get: (n: string) => o[n.toLowerCase()] ?? null })

test('sem sessão: 401', async () => {
  const r = await decideAdmin({ getUserId: async () => null, getRole: async () => 'admin' })
  assert.deepEqual(r, { ok: false, status: 401, error: 'unauthorized' })
})
test('erro ao ler a sessão: 401 (fecha por padrão)', async () => {
  const r = await decideAdmin({ getUserId: async () => { throw new Error('x') }, getRole: async () => 'admin' })
  assert.equal(r.ok, false)
  assert.equal((r as { status: number }).status, 401)
})
test('papel que não é admin: 403', async () => {
  for (const role of ['patient', 'doctor', 'sales', '', null]) {
    const r = await decideAdmin({ getUserId: async () => 'u1', getRole: async () => role as string | null })
    assert.deepEqual(r, { ok: false, status: 403, error: 'forbidden' }, String(role))
  }
})
test('erro ao ler o perfil: 403 (fecha por padrão)', async () => {
  const r = await decideAdmin({ getUserId: async () => 'u1', getRole: async () => { throw new Error('db') } })
  assert.equal((r as { status: number }).status, 403)
})
test('admin autenticado: ok com o id', async () => {
  const r = await decideAdmin({ getUserId: async () => 'u1', getRole: async () => 'admin' })
  assert.deepEqual(r, { ok: true, userId: 'u1' })
})
test('cron: precisa de segredo configurado e correto', () => {
  assert.equal(cronAuthorized(undefined, h({ 'x-cron-secret': 'undefined' })), false)
  assert.equal(cronAuthorized('', h({ 'x-cron-secret': '' })), false)
  assert.equal(cronAuthorized('s3', h({})), false)
  assert.equal(cronAuthorized('s3', h({ 'x-cron-secret': 'errado' })), false)
  assert.equal(cronAuthorized('s3', h({ 'x-cron-secret': 's3' })), true)
  assert.equal(cronAuthorized('s3', h({ authorization: 'Bearer s3' })), true)
  assert.equal(cronAuthorized('s3', h({ authorization: 'Bearer outro' })), false)
})
