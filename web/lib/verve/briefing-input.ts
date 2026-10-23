// Validação de entrada da rota /api/admin/verve/briefings (formato da Hormone: posts[] com tipo/tema/pilar/scheduled_at; legenda opcional).
// Pura e testada. Só barra; a decisão continua sendo do CEO.
import { complianceViolations } from './compliance'

export const PILARES = ['familia', 'autoridade', 'lifestyle'] as const
export const TIPOS = ['carrossel', 'reel', 'story'] as const
export const MAX_POSTS = 14

export interface SlideInput { titulo: string; texto: string }
export interface PostInput { tipo: string; tema: string; pilar: string; scheduled_at: string; legenda?: string; slides?: SlideInput[] }
export const MAX_SLIDES = 10
export interface BriefingInput {
  titulo: string; objetivo: string; publico_alvo: string; pilar: string
  gatilho_manychat: string; semana: string; posts: PostInput[]
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, min: number, max: number): v is string => typeof v === 'string' && v.trim().length >= min && v.length <= max

export function validateBriefingInput(b: unknown): { ok: true; value: BriefingInput } | { ok: false; erros: string[] } {
  const erros: string[] = []
  if (!isObj(b)) return { ok: false, erros: ['corpo_nao_e_objeto'] }
  if (!str(b.titulo, 3, 140)) erros.push('titulo')
  if (!str(b.objetivo, 10, 500)) erros.push('objetivo')
  const publico = b.publico_alvo ?? ''
  if (!(typeof publico === 'string' && publico.length <= 300)) erros.push('publico_alvo')
  const pilar = b.pilar ?? 'autoridade'
  if (!(PILARES as readonly unknown[]).includes(pilar)) erros.push('pilar')
  const gatilho = b.gatilho_manychat ?? ''
  if (!(gatilho === '' || (typeof gatilho === 'string' && /^[A-Z0-9]{3,30}$/.test(gatilho)))) erros.push('gatilho_manychat')
  if (!(typeof b.semana === 'string' && /^\d{4}-W\d{2}$/.test(b.semana))) erros.push('semana')
  const posts = b.posts
  const textos: string[] = [String(b.titulo ?? ''), String(b.objetivo ?? '')]
  const norm: PostInput[] = []
  if (!Array.isArray(posts) || posts.length < 1 || posts.length > MAX_POSTS) erros.push('posts')
  else posts.forEach((p, n) => {
    const w = `posts[${n}]`
    if (!isObj(p)) { erros.push(w); return }
    if (!(TIPOS as readonly unknown[]).includes(p.tipo)) erros.push(`${w}.tipo`)
    if (!str(p.tema, 3, 120)) erros.push(`${w}.tema`)
    const pp = p.pilar ?? pilar
    if (!(PILARES as readonly unknown[]).includes(pp)) erros.push(`${w}.pilar`)
    if (!(typeof p.scheduled_at === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/.test(p.scheduled_at) && !Number.isNaN(Date.parse(p.scheduled_at)))) erros.push(`${w}.scheduled_at`)
    if (p.legenda !== undefined && !(typeof p.legenda === 'string' && p.legenda.length <= 2200)) erros.push(`${w}.legenda`)
    // Slides do Gustavo (opcionais): sequência lógica do carrossel, título e texto de cada slide. Entram no filtro de publicidade médica.
    let slides: SlideInput[] | undefined
    if (p.slides !== undefined && p.slides !== null) {
      if (!Array.isArray(p.slides) || p.slides.length < 3 || p.slides.length > MAX_SLIDES) erros.push(`${w}.slides`)
      else {
        slides = []
        p.slides.forEach((s, k) => {
          if (!isObj(s) || !str(s.titulo, 3, 80) || !str(s.texto, 3, 280)) { erros.push(`${w}.slides[${k}]`); return }
          slides!.push({ titulo: String(s.titulo), texto: String(s.texto) })
          textos.push(String(s.titulo), String(s.texto))
        })
      }
    }
    textos.push(String(p.tema ?? ''), String(p.legenda ?? ''))
    norm.push({ tipo: String(p.tipo), tema: String(p.tema), pilar: String(pp), scheduled_at: String(p.scheduled_at), ...(typeof p.legenda === 'string' && p.legenda ? { legenda: p.legenda } : {}), ...(slides && slides.length ? { slides } : {}) })
  })
  for (const v of complianceViolations(textos.join('\n'))) erros.push(`publicidade_medica:${v}`)
  if (erros.length) return { ok: false, erros }
  return { ok: true, value: { titulo: String(b.titulo), objetivo: String(b.objetivo), publico_alvo: String(publico), pilar: String(pilar), gatilho_manychat: String(gatilho), semana: String(b.semana), posts: norm } }
}
