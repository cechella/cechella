// Números da aba Métricas do painel. Regra do projeto: dado desconhecido é null + motivo, NUNCA zero (zero é um número).
import type { Metrica } from './insights'

export interface MetricasPainel {
  followers_count: number | null
  followers_gained_week: number | null
  reach_week: number | null
  sends_reach_pct: number | null
  saves_recent: number | null
  midias_lidas: number
  midias_total: number
  motivos: Record<string, string>
  updated_at: string
}

const soma = (xs: Array<number | null>): number | null => {
  const v = xs.filter((x): x is number => x !== null)
  return v.length ? v.reduce((a, b) => a + b, 0) : null
}

export function montarMetricas(p: {
  seguidores: number | null
  ganhos7d: Metrica
  alcance7d: Metrica
  midias: Array<{ saved: Metrica; shares: Metrica; reach: Metrica }>
  agora?: Date
}): MetricasPainel {
  const motivos: Record<string, string> = {}
  const salvos = soma(p.midias.map(m => m.saved.valor))
  const compart = soma(p.midias.map(m => m.shares.valor))
  const alcanceMidias = soma(p.midias.map(m => m.reach.valor))
  const lidas = p.midias.filter(m => m.saved.valor !== null || m.shares.valor !== null || m.reach.valor !== null).length
  if (p.seguidores === null) motivos.followers_count = 'perfil_indisponivel'
  if (p.ganhos7d.valor === null) motivos.followers_gained_week = p.ganhos7d.erro ?? 'sem_valor'
  if (p.alcance7d.valor === null) motivos.reach_week = p.alcance7d.erro ?? 'sem_valor'
  if (salvos === null) motivos.saves_recent = 'insights_das_midias_indisponiveis'
  const pct = compart !== null && alcanceMidias !== null && alcanceMidias > 0 ? Math.round((compart / alcanceMidias) * 1000) / 10 : null
  if (pct === null) motivos.sends_reach_pct = alcanceMidias === 0 ? 'alcance_zero_nas_midias' : 'envios_ou_alcance_indisponiveis'
  return {
    followers_count: p.seguidores, followers_gained_week: p.ganhos7d.valor, reach_week: p.alcance7d.valor, sends_reach_pct: pct, saves_recent: salvos,
    midias_lidas: lidas, midias_total: p.midias.length, motivos, updated_at: (p.agora ?? new Date()).toISOString(),
  }
}

export const NAO_APURADO = 'não apurado'
export const mostrar = (v: number | null, sufixo = ''): string => (v === null ? NAO_APURADO : `${v.toLocaleString('pt-BR')}${sufixo}`)
