import { generatePhotoForPost } from './generate-photo'
import { composeSlide } from './compose-slide'
import { put } from '@vercel/blob'
import sharp from 'sharp'
import { FAIXA_PADRAO, type Faixa } from './persona'
import { fotoConferida, leitorClaude, type Leitor, type QaEntrada } from './foto-qa'
import { sementeDoPost } from './personagem'

const PRAZO_MS = 45_000   // a rota tem 60 s no plano atual: depois disso não começa nova tentativa

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

// Deriva badge a partir do persona detectado
export function buildBadge(persona: string, pilar: string, faixa: Faixa = FAIXA_PADRAO): string {
  if (pilar === 'familia') return 'FAMÍLIA'
  if (pilar === 'lifestyle') return 'LIFESTYLE'
  return `PARA ${persona === 'homem_40_60' ? 'HOMENS' : 'MULHERES'} DE ${faixa.min} A ${faixa.max} ANOS`
}

// Gera N slides compostos (foto Flux + texto SVG) e persiste no Vercel Blob.
export async function renderCarrossel(params: {
  titulo: string
  temas?: string[]       // tema de cada slide (vindo do briefing do Gustavo)
  descricoes?: string[]  // descrição por slide (opcional)
  pilar?: string
  slides?: number
  badge?: string
  persona?: string
  faixa?: Faixa
  instrucao?: string
  qaLog?: QaEntrada[]   // recebe cada conferência (slide, tentativa, motivo, ação)
  leitor?: Leitor       // injetável nos testes; padrão: modelo de visão
  postId?: string
}): Promise<string[]> {
  const {
    titulo, temas = [], descricoes = [],
    pilar = 'autoridade', slides = 8,
    persona = 'mulher_35_50', postId = 'preview',
  } = params
  const total = Math.max(2, Math.min(slides, 10))
  const faixa = params.faixa ?? FAIXA_PADRAO
  const badge = params.badge ?? buildBadge(persona, pilar, faixa)

  if (!process.env.FAL_KEY) return []

  // A MESMA personagem em todo o carrossel: gera a foto de abertura (conferida), e os demais slides partem dela (edição por referência), cada um conferido
  // também quanto a "é a mesma pessoa". O prazo protege o limite de 60 s da rota: esgotado, para de refazer e o post fica como estava.
  const limite = Date.now() + PRAZO_MS
  const ler = params.leitor ?? leitorClaude()
  const log = params.qaLog ?? []
  const seed = sementeDoPost(postId)
  const uma = (i: number, referencia?: string) => {
    const isCta = i + 1 === total
    const tema = temas[i] ?? titulo
    return fotoConferida({
      slide: i + 1, persona, faixa, instrucao: params.instrucao, referencia, limite,
      gerar: instrucao => generatePhotoForPost({ tema, pilar, persona, isCta, faixa, indice: i, total, instrucao, referencia, seed }).then(r => r.url),
      ler, log,
    })
  }
  const abertura = await uma(0)
  const demais = abertura ? await Promise.all(Array.from({ length: total - 1 }, (_, k) => uma(k + 1, abertura))) : Array.from({ length: total - 1 }, () => '')
  const photoUrls = [abertura, ...demais]

  // Para cada foto: baixa, composta com texto e faz upload no Blob
  const blobUrls = await Promise.all(
    photoUrls.map(async (url, i) => {
      if (!url) return ''
      const isCta = i + 1 === total
      const slideNum = i + 1
      const slideTema = temas[i] ?? titulo
      const slideDesc = descricoes[i] ?? undefined

      try {
        // Download da foto do Flux
        const res = await fetch(url)
        const photoBuffer = Buffer.from(await res.arrayBuffer())

        // Composta texto sobre a foto
        const composed = await composeSlide({
          titulo: isCta ? 'Percebeu alguma mudança?' : slideTema,
          descricao: isCta ? 'Converse com um médico para uma avaliação individual.' : slideDesc,
          badge: slideNum === 1 ? badge : undefined,  // badge só no slide 1
          slideNum,
          totalSlides: total,
          imageBuffer: photoBuffer,
          isCta,
        })

        // A API de publicação do Instagram documenta JPEG como único formato de imagem: converte antes de subir.
        const jpeg = await sharp(composed).jpeg({ quality: 92, mozjpeg: true }).toBuffer()
        const blob = await put(
          `verve/slides/${postId}/slide-${String(slideNum).padStart(2, '0')}.jpg`,
          jpeg,
          { access: 'public', contentType: 'image/jpeg' }
        )
        return blob.url
      } catch {
        return '' // falha fechada: nunca devolve foto sem texto no lugar do slide
      }
    })
  )

  // Carrossel incompleto não vai para aprovação: se qualquer slide falhou, devolve vazio e o post fica como rascunho sem imagem.
  return blobUrls.every(Boolean) ? blobUrls : []
}
