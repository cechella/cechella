import { fal } from '@fal-ai/client'
import { FAIXA_PADRAO, idadeDoSlide, type Faixa } from './persona'

export interface PhotoPromptInput {
  tema: string
  pilar: 'familia' | 'autoridade' | 'lifestyle' | string
  persona?: 'mulher_35_50' | 'homem_40_60' | string
  isCta?: boolean
  faixa?: Faixa      // faixa etária do público (do briefing); padrão 40 a 60
  indice?: number    // posição do slide: varia a idade dentro da faixa
  instrucao?: string // direção de arte pedida pelo CEO (já validada e em inglês), ex.: "warmer light, outdoor"
}

// A idade vem da faixa do briefing. O modelo de imagem tende a rejuvenescer, por isso a descrição pede sinais de idade reais.
export function descricaoPessoa(persona: string, faixa: Faixa = FAIXA_PADRAO, indice = 0): string {
  const idade = idadeDoSlide(faixa, indice)
  const sinais = `aged ${idade}, mature face with natural fine lines and expression lines, some gray hair, real skin texture, minimal makeup, not a young model, age-appropriate`
  if (persona === 'homem_40_60') return `Brazilian man ${sinais}, well-groomed, natural look`
  if (persona === 'mulher_35_50') return `Brazilian woman ${sinais}`
  return persona
}

const pilarMood: Record<string, string> = {
  familia:    'warm natural light, home environment, soft tones, intimate',
  autoridade: 'clinical editorial, clean white/grey background, professional lighting, Leica M11',
  lifestyle:  'golden hour outdoor, São Paulo or beach, cinematic, warm',
}

// Traduz keywords do tema para cenas visuais em inglês
function temaToVisual(tema: string): string {
  const t = tema.toLowerCase()
  if (/cansa[çc]o|fadiga|energia|disposi[çc][aã]o/.test(t)) return 'tired exhausted person sitting on bed in the morning, looking fatigued'
  if (/libido|desejo|sexual/.test(t)) return 'couple looking distant, emotional disconnect, thoughtful expression'
  if (/gordura|peso|corpo|composi[çc][aã]o/.test(t)) return 'person looking at mirror, body awareness, thoughtful expression'
  if (/irritabilidade|humor|estresse|ansiedade/.test(t)) return 'person looking tense, stressed, hands on temples'
  if (/sono|inso[mô]nia|dormir/.test(t)) return 'person lying awake in bed at night, restless sleep'
  if (/exame|diagn[oó]stico|laborat[oó]rio/.test(t)) return 'doctor reviewing blood test results with patient, clinical setting'
  if (/testosterona|horm[oô]nio/.test(t)) return 'person in consultation with doctor, discussing health results'
  if (/andropausa/.test(t)) return 'middle-aged man looking reflective, mature and thoughtful expression'
  if (/menopausa|estrog[eê]nio/.test(t)) return 'middle-aged woman looking serene, contemplative, natural environment'
  if (/consul|m[eé]dic|avalia[çc][aã]o/.test(t)) return 'warm doctor-patient consultation, office setting, reassuring atmosphere'
  return tema // fallback: usa o tema direto
}

export function buildPhotoPrompt(input: PhotoPromptInput): string {
  const { tema, pilar, persona = 'mulher_35_50', isCta = false, faixa, indice = 0, instrucao } = input

  const subject = descricaoPessoa(persona, faixa, indice)
  const mood = pilarMood[pilar] ?? 'editorial, natural light'

  const extra = instrucao ? `, art direction: ${instrucao}` : ''

  // Slide CTA: diferencia consultório por persona
  if (isCta) {
    const ctaScene = persona === 'homem_40_60'
      ? 'middle-aged man in warm doctor consultation, masculine clinical environment, reassuring atmosphere'
      : 'woman in warm doctor consultation, feminine clinical environment, reassuring atmosphere'
    return `editorial photography, ${subject}, ${ctaScene}, ${mood}${extra}, photorealistic, ultra detailed, 4:5 portrait, no text, no watermark`
  }

  const visual = temaToVisual(tema)
  return `editorial photography, ${subject}, ${visual}, ${mood}${extra}, photorealistic, ultra detailed, 4:5 portrait, no text, no watermark`
}

export interface GeneratedPhoto {
  url: string
  prompt: string
}

async function generatePhotoWithRetry(prompt: string, retries = 1): Promise<GeneratedPhoto> {
  if (!process.env.FAL_KEY) {
    throw new Error('FAL_KEY não configurada — adicione no Vercel Dashboard → Environment Variables')
  }

  fal.config({ credentials: process.env.FAL_KEY })

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fal.subscribe('fal-ai/flux-pro/v1.1', {
        input: {
          prompt,
          image_size: { width: 1080, height: 1350 },
          num_images: 1,
          output_format: 'jpeg',
          safety_tolerance: '2',
        },
      }) as { data: { images: Array<{ url: string }> } }

      const url = result.data.images[0]?.url
      if (!url) throw new Error('Flux não retornou imagem')

      // Valida que a URL é acessível
      const check = await fetch(url, { method: 'HEAD' })
      if (!check.ok || !check.headers.get('content-type')?.startsWith('image/')) {
        throw new Error(`URL inválida: ${check.status}`)
      }

      return { url, prompt }
    } catch (err) {
      if (attempt === retries) throw err
    }
  }
  throw new Error('Falha após retries')
}

export async function generatePhoto(prompt: string): Promise<GeneratedPhoto> {
  return generatePhotoWithRetry(prompt, 1)
}

export async function generatePhotoForPost(input: PhotoPromptInput): Promise<GeneratedPhoto> {
  const prompt = buildPhotoPrompt(input)
  return generatePhoto(prompt)
}
