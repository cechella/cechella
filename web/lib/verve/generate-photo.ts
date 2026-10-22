import { fal } from '@fal-ai/client'

export interface PhotoPromptInput {
  tema: string
  pilar: 'familia' | 'autoridade' | 'lifestyle' | string
  persona?: 'mulher_35_50' | 'homem_40_60' | string
}

// Gera um prompt Flux otimizado para o nicho de saúde hormonal
export function buildPhotoPrompt(input: PhotoPromptInput): string {
  const { tema, pilar, persona = 'mulher_35_50' } = input

  const personaDesc: Record<string, string> = {
    mulher_35_50: 'Brazilian woman, 40s, natural curly hair, real skin texture, no makeup or light makeup',
    homem_40_60:  'Brazilian man, 50s, well-groomed, distinguished, natural look',
  }

  const pilarMood: Record<string, string> = {
    familia:    'warm natural light, home environment, soft tones, intimate',
    autoridade: 'clinical editorial, clean white/grey background, professional lighting, Leica M11',
    lifestyle:  'golden hour outdoor, São Paulo or beach, cinematic, warm',
  }

  const subject = personaDesc[persona] ?? persona
  const mood = pilarMood[pilar] ?? 'editorial, natural light'

  return `editorial photography, ${subject}, ${tema}, ${mood}, photorealistic, ultra detailed, 4:5 portrait, no text, no watermark`
}

export interface GeneratedPhoto {
  url: string
  prompt: string
}

export async function generatePhoto(prompt: string): Promise<GeneratedPhoto> {
  if (!process.env.FAL_KEY) {
    throw new Error('FAL_KEY não configurada — adicione no Vercel Dashboard → Environment Variables')
  }

  fal.config({ credentials: process.env.FAL_KEY })

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

  return { url, prompt }
}

export async function generatePhotoForPost(input: PhotoPromptInput): Promise<GeneratedPhoto> {
  const prompt = buildPhotoPrompt(input)
  return generatePhoto(prompt)
}
