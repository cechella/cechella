import { generatePhotoForPost } from './generate-photo'
import { put } from '@vercel/blob'

export interface SlideInput {
  titulo: string
  descricao?: string
  badge?: string
  pilar?: string
  slide_number?: number
  total_slides?: number
  is_cta?: boolean
  image_url?: string
}

// Mantido para compatibilidade com /api/admin/verve/render (preview manual)
export async function renderSlide(input: SlideInput): Promise<Buffer> {
  const { image_url = '' } = input
  return Buffer.from(image_url)
}

// Gera N fotos via Flux 1.1 Pro — uma por slide com tema específico.
// Upload para Vercel Blob, retorna URLs públicas.
export async function renderCarrossel(params: {
  titulo: string
  temas?: string[]       // tema de cada slide (vindo do briefing do Gustavo)
  pilar?: string
  slides?: number
  badge?: string
  persona?: string
  postId?: string
}): Promise<string[]> {
  const { titulo, temas = [], pilar = 'autoridade', slides = 8, persona = 'mulher_35_50', postId = 'preview' } = params
  const total = Math.max(2, Math.min(slides, 10))

  if (!process.env.FAL_KEY) return []

  const photoPromises = Array.from({ length: total }, (_, i) => {
    const isCta = i + 1 === total
    // Usa tema específico do slide se disponível, senão o título do post
    const tema = temas[i] ?? titulo
    return generatePhotoForPost({ tema, pilar, persona, isCta })
      .then(r => r.url)
      .catch(() => '')
  })

  const photoUrls = await Promise.all(photoPromises)

  const blobUrls = await Promise.all(
    photoUrls.map(async (url, i) => {
      if (!url) return ''
      try {
        const res = await fetch(url)
        const buf = await res.arrayBuffer()
        const blob = await put(
          `verve/slides/${postId}/slide-${String(i + 1).padStart(2, '0')}.jpg`,
          buf,
          { access: 'public', contentType: 'image/jpeg' }
        )
        return blob.url
      } catch {
        return url
      }
    })
  )

  return blobUrls.filter(Boolean)
}
