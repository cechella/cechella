import { fal } from '@fal-ai/client'
import { FAIXA_PADRAO, type Faixa } from './persona'
import { promptDoSlide, promptComReferencia } from './personagem'

export interface PhotoPromptInput {
  tema: string
  pilar: 'familia' | 'autoridade' | 'lifestyle' | string
  persona?: 'mulher_35_50' | 'homem_40_60' | string
  isCta?: boolean
  faixa?: Faixa      // faixa etária do público (do briefing); padrão 40 a 60
  indice?: number    // posição do slide no carrossel
  total?: number
  instrucao?: string // direção de arte pedida pelo CEO ou correção do VERVE (em inglês, já validada)
  referencia?: string // URL da foto de abertura: quando presente, a foto é EDITADA a partir dela (mesma pessoa)
  seed?: number
}

// Compatível com os testes e usos antigos: monta o texto da foto pelo personagem e pelo roteiro visual.
export function buildPhotoPrompt(input: PhotoPromptInput): string {
  const { tema, pilar, persona = 'mulher_35_50', faixa = FAIXA_PADRAO, indice = 0, instrucao } = input
  const total = input.total ?? (input.isCta ? indice + 1 : Math.max(indice + 2, 4))
  return input.referencia
    ? promptComReferencia({ persona, indice, total, tema, instrucao })
    : promptDoSlide({ persona, faixa, indice, total, tema, pilar, instrucao })
}

export interface GeneratedPhoto {
  url: string
  prompt: string
}

async function chamarFal(modelo: string, input: Record<string, unknown>): Promise<string> {
  if (!process.env.FAL_KEY) throw new Error('FAL_KEY não configurada — adicione no Vercel Dashboard → Environment Variables')
  fal.config({ credentials: process.env.FAL_KEY })
  const result = await fal.subscribe(modelo, { input }) as { data: { images: Array<{ url: string }> } }
  const url = result.data.images[0]?.url
  if (!url) throw new Error('Flux não retornou imagem')
  const check = await fetch(url, { method: 'HEAD' })   // valida que a URL é acessível
  if (!check.ok || !check.headers.get('content-type')?.startsWith('image/')) throw new Error(`URL inválida: ${check.status}`)
  return url
}

const MODELO_TEXTO = 'fal-ai/flux-pro/v1.1'
const MODELO_REFERENCIA = process.env.VERVE_FOTO_MODELO_REFERENCIA ?? 'fal-ai/flux-pro/kontext'

export async function generatePhoto(prompt: string, seed?: number): Promise<GeneratedPhoto> {
  const url = await chamarFal(MODELO_TEXTO, { prompt, image_size: { width: 1080, height: 1350 }, num_images: 1, output_format: 'jpeg', safety_tolerance: '2', ...(seed ? { seed } : {}) })
  return { url, prompt }
}

export async function generatePhotoForPost(input: PhotoPromptInput): Promise<GeneratedPhoto> {
  if (input.referencia) {
    const prompt = buildPhotoPrompt(input)
    try {
      const url = await chamarFal(MODELO_REFERENCIA, { prompt, image_url: input.referencia, num_images: 1, output_format: 'jpeg', safety_tolerance: '2' })
      return { url, prompt }
    } catch { /* edição por referência indisponível: cai para o texto com a mesma descrição e semente; a conferência de "mesma pessoa" decide */ }
    return generatePhoto(buildPhotoPrompt({ ...input, referencia: undefined }), input.seed)
  }
  return generatePhoto(buildPhotoPrompt(input), input.seed)
}
