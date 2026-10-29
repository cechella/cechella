import test from 'node:test'
import assert from 'node:assert/strict'
import { montarMetricas, mostrar } from './metricas-painel.ts'

const ok = (valor: number) => ({ valor })
const falta = (erro: string) => ({ valor: null, erro })

test('dado ausente é null com motivo, nunca zero (o caso do painel que mostrava alcance 0 e salvamentos 0)', () => {
  const m = montarMetricas({ seguidores: 49184, ganhos7d: falta('metrica_ausente'), alcance7d: falta('sem_valor'), midias: [{ saved: falta('x'), shares: falta('x'), reach: falta('x') }] })
  assert.equal(m.followers_count, 49184)
  assert.equal(m.reach_week, null); assert.equal(m.followers_gained_week, null); assert.equal(m.saves_recent, null); assert.equal(m.sends_reach_pct, null)
  assert.equal(m.midias_lidas, 0); assert.equal(m.motivos.reach_week, 'sem_valor'); assert.equal(m.motivos.saves_recent, 'insights_das_midias_indisponiveis')
  assert.equal(mostrar(m.reach_week), 'não apurado'); assert.equal(mostrar(m.followers_count), '49.184')
})

test('zero verdadeiro continua sendo zero e a taxa só existe com envios e alcance conhecidos', () => {
  const m = montarMetricas({ seguidores: 100, ganhos7d: ok(0), alcance7d: ok(1200), midias: [{ saved: ok(0), shares: ok(3), reach: ok(200) }, { saved: ok(5), shares: ok(1), reach: ok(200) }] })
  assert.equal(m.followers_gained_week, 0); assert.equal(m.saves_recent, 5); assert.equal(m.sends_reach_pct, 1); assert.equal(m.midias_lidas, 2)
  const sem = montarMetricas({ seguidores: 100, ganhos7d: ok(1), alcance7d: ok(1), midias: [{ saved: ok(2), shares: ok(0), reach: ok(0) }] })
  assert.equal(sem.sends_reach_pct, null); assert.equal(sem.motivos.sends_reach_pct, 'alcance_zero_nas_midias')   // dividir por alcance zero não vira 0%
})

test('leitura parcial usa só o que foi lido e diz quantas mídias contaram', () => {
  const m = montarMetricas({ seguidores: null, ganhos7d: ok(2), alcance7d: ok(10), midias: [{ saved: ok(4), shares: falta('x'), reach: ok(100) }, { saved: falta('x'), shares: falta('x'), reach: falta('x') }] })
  assert.equal(m.followers_count, null); assert.equal(m.motivos.followers_count, 'perfil_indisponivel'); assert.equal(m.saves_recent, 4); assert.equal(m.midias_lidas, 1); assert.equal(m.midias_total, 2); assert.equal(m.sends_reach_pct, null)
})
