// CONTRATO ATLAS ↔ VERVE (22/10/2026). Implementação de referência, sem dependências. O ATLAS tem a espelho em Python
// (core/src/verve_contract.py) e os dois lados precisam reproduzir o MESMO hash para o vetor docs/verve/briefing-exemplo.*
import { createHash } from 'node:crypto'
import { complianceViolations } from './compliance'

export const PILARES = ['familia', 'autoridade', 'lifestyle'] as const
export const TIPOS = ['carrossel', 'reel', 'story'] as const
export const FONTES = ['instagram_graph_api', 'manychat', 'verve_posts', 'manual'] as const
export const MAX_ITENS = 14

type Json = null | boolean | number | string | Json[] | { [k: string]: Json }

// JSON canônico: chaves ordenadas recursivamente, sem espaços, UTF-8. Igual a json.dumps(sort_keys=True, separators=(',',':'), ensure_ascii=False).
export function canonicalize(value: Json): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']'
  const keys = Object.keys(value).sort()
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalize(value[k])).join(',') + '}'
}

export function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}

export const CAMPOS_CONTEUDO = ['titulo', 'objetivo', 'publico_alvo', 'pilar', 'indicadores', 'gatilho_manychat', 'plano_semana'] as const

// O que o hash cobre: SOMENTE os campos de conteúdo (nunca id, status, datas ou quem decidiu).
export function conteudoCanonico(briefing: Record<string, Json>): string {
  const only: Record<string, Json> = {}
  for (const k of CAMPOS_CONTEUDO) only[k] = (briefing[k] ?? null) as Json
  return canonicalize(only)
}

export function hashBriefing(briefing: Record<string, Json>): string {
  return sha256Hex(conteudoCanonico(briefing))
}

const isStr = (v: unknown, min: number, max: number): v is string => typeof v === 'string' && v.trim().length >= min && v.length <= max
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const DIA = /^\d{4}-\d{2}-\d{2}$/
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/
const PALAVRA = /^[A-Z0-9]{3,30}$/

// Devolve a lista de problemas (vazia = válido). Nenhum campo é preenchido por padrão: o que faltar é erro, nunca valor inventado.
export function validateBriefing(b: unknown): string[] {
  const erros: string[] = []
  if (!isObj(b)) return ['briefing_nao_e_objeto']
  if (!isStr(b.titulo, 3, 140)) erros.push('titulo')
  if (!isStr(b.objetivo, 10, 500)) erros.push('objetivo')
  if (!isStr(b.publico_alvo, 5, 300)) erros.push('publico_alvo')
  if (!(PILARES as readonly unknown[]).includes(b.pilar)) erros.push('pilar')
  if (!Array.isArray(b.indicadores) || b.indicadores.length < 1 || b.indicadores.length > 12) erros.push('indicadores')
  else b.indicadores.forEach((i, n) => {
    if (!isObj(i) || !isStr(i.nome, 3, 80) || !(FONTES as readonly unknown[]).includes(i.fonte) || !(i.meta === null || isStr(i.meta, 1, 80))) erros.push(`indicadores[${n}]`)
  })
  const g = b.gatilho_manychat
  if (g !== null && !(isObj(g) && g.tipo === 'manychat' && typeof g.palavra === 'string' && PALAVRA.test(g.palavra) && g.fluxo === 'comentario>dm>whatsapp_business')) erros.push('gatilho_manychat')
  const plano = b.plano_semana
  if (!Array.isArray(plano) || plano.length < 1 || plano.length > MAX_ITENS) erros.push('plano_semana')
  else plano.forEach((it, n) => {
    const p = `plano_semana[${n}]`
    if (!isObj(it)) { erros.push(p); return }
    if (typeof it.dia !== 'string' || !DIA.test(it.dia) || Number.isNaN(Date.parse(it.dia))) erros.push(`${p}.dia`)
    if (typeof it.hora !== 'string' || !HORA.test(it.hora)) erros.push(`${p}.hora`)
    if (!(TIPOS as readonly unknown[]).includes(it.tipo)) erros.push(`${p}.tipo`)
    if (!isStr(it.titulo, 3, 120)) erros.push(`${p}.titulo`)
    if (!(PILARES as readonly unknown[]).includes(it.pilar)) erros.push(`${p}.pilar`)
    if (!isStr(it.legenda, 10, 2200)) erros.push(`${p}.legenda`)
    if (it.revisao_necessaria !== true) erros.push(`${p}.revisao_necessaria`)   // todo conteúdo passa por revisão e autorização do CEO
    if (it.tipo === 'carrossel') {
      const s = it.slides
      if (!Array.isArray(s) || s.length < 3 || s.length > 10) erros.push(`${p}.slides`)
      else s.forEach((sl, k) => { if (!isObj(sl) || !isStr(sl.titulo, 3, 80) || !isStr(sl.texto, 3, 280)) erros.push(`${p}.slides[${k}]`) })
    } else if (!(it.slides === null || (Array.isArray(it.slides) && it.slides.length === 0))) erros.push(`${p}.slides`)
    const c = it.cta
    if (!(c === null || (isObj(c) && typeof c.palavra === 'string' && PALAVRA.test(c.palavra) && isStr(c.texto, 5, 200)))) erros.push(`${p}.cta`)
    // publicidade médica: o texto de todo o item passa pelo filtro; violação bloqueia a aprovação
    const textos: string[] = [String(it.titulo ?? ''), String(it.legenda ?? '')]
    if (Array.isArray(it.slides)) for (const sl of it.slides) if (isObj(sl)) textos.push(String(sl.titulo ?? ''), String(sl.texto ?? ''))
    if (isObj(c)) textos.push(String(c.texto ?? ''))
    for (const v of complianceViolations(textos.join('\n'))) erros.push(`${p}.publicidade_medica:${v}`)
  })
  return erros
}
