// Motivo da recusa de um post pelo CEO: alimenta o PERFIL DE GOSTO que o Gustavo e o VERVE consultam antes de propor o próximo. Sem coluna nova: vai em `error_msg` com o prefixo "recusa:".
export const ASPECTOS = ['foto', 'texto', 'gancho', 'layout', 'legenda', 'tema'] as const
export type Aspecto = (typeof ASPECTOS)[number]
export interface MotivoRecusa { aspectos: Aspecto[]; texto?: string }

export function validarMotivo(x: unknown): MotivoRecusa | null {
  const o = (x && typeof x === 'object' ? x : null) as Record<string, unknown> | null
  if (!o) return null
  const aspectos = (Array.isArray(o.aspectos) ? o.aspectos : []).filter((a): a is Aspecto => (ASPECTOS as readonly string[]).includes(a as string))
  const texto = typeof o.texto === 'string' ? o.texto.replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) : ''
  if (!aspectos.length && !texto) return null
  return { aspectos: Array.from(new Set(aspectos)), ...(texto ? { texto } : {}) }
}

export function montarMotivo(m: MotivoRecusa): string {
  return `recusa:${m.aspectos.join(',')}|${m.texto ?? ''}`.slice(0, 280)
}

export function lerMotivo(errorMsg: unknown): MotivoRecusa | null {
  if (typeof errorMsg !== 'string' || !errorMsg.startsWith('recusa:')) return null
  const [asp, ...resto] = errorMsg.slice('recusa:'.length).split('|')
  return validarMotivo({ aspectos: asp ? asp.split(',') : [], texto: resto.join('|') })
}
