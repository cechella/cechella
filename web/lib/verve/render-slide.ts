import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

const pilarColors: Record<string, { bg: string; accent: string }> = {
  familia:    { bg: '#0d0718', accent: '#a855f7' },
  autoridade: { bg: '#080f1a', accent: '#3b82f6' },
  lifestyle:  { bg: '#120a05', accent: '#f97316' },
}

let _fontData: ArrayBuffer | null = null
async function getFont(): Promise<ArrayBuffer> {
  if (_fontData) return _fontData
  const res = await fetch(
    'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZBiA.woff2',
    { next: { revalidate: 86400 } }
  )
  _fontData = await res.arrayBuffer()
  return _fontData
}

export interface SlideInput {
  titulo: string
  descricao?: string
  badge?: string
  pilar?: string
  slide_number?: number
  total_slides?: number
  is_cta?: boolean
}

export async function renderSlide(input: SlideInput): Promise<Buffer> {
  const {
    titulo,
    descricao = '',
    badge = 'Dr. Vinícius Cechella',
    pilar = 'autoridade',
    slide_number = 1,
    total_slides = 1,
    is_cta = false,
  } = input

  const colors = pilarColors[pilar] ?? pilarColors.autoridade
  const fontData = await getFont()

  const element = {
    type: 'div',
    props: {
      style: {
        width: 1080, height: 1350,
        background: colors.bg,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '80px',
        fontFamily: 'Inter',
        position: 'relative',
      },
      children: [
        // Top: badge + counter
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
            children: [
              {
                type: 'div',
                props: {
                  style: { fontSize: 22, fontWeight: 700, color: colors.accent, letterSpacing: '0.15em', textTransform: 'uppercase' },
                  children: badge,
                },
              },
              total_slides > 1 ? {
                type: 'div',
                props: {
                  style: { fontSize: 22, color: 'rgba(255,255,255,0.3)', fontWeight: 700 },
                  children: `${slide_number} / ${total_slides}`,
                },
              } : null,
            ].filter(Boolean),
          },
        },
        // Center
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', gap: 24, flex: 1, justifyContent: 'center' },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: titulo.length > 50 ? 64 : titulo.length > 30 ? 76 : 92,
                    fontWeight: 700,
                    color: is_cta ? colors.accent : '#ffffff',
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                  },
                  children: titulo,
                },
              },
              descricao ? {
                type: 'div',
                props: {
                  style: { fontSize: 36, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, fontWeight: 400 },
                  children: descricao,
                },
              } : null,
            ].filter(Boolean),
          },
        },
        // Bottom
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', gap: 16 },
            children: [
              { type: 'div', props: { style: { height: 4, width: 80, background: colors.accent, borderRadius: 2 } } },
              {
                type: 'div',
                props: {
                  style: { fontSize: 26, color: 'rgba(255,255,255,0.35)', fontWeight: 700 },
                  children: '@viniciuscechella',
                },
              },
            ],
          },
        },
      ],
    },
  }

  const svg = await satori(element as Parameters<typeof satori>[0], {
    width: 1080, height: 1350,
    fonts: [{ name: 'Inter', data: fontData, weight: 700, style: 'normal' }],
  })

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1080 } })
  return Buffer.from(resvg.render().asPng())
}

// Gera N slides para um carrossel e retorna array de Buffers PNG
export async function renderCarrossel(params: {
  titulo: string
  temas?: string[]  // conteúdo por slide (opcional)
  pilar?: string
  slides?: number
}): Promise<Buffer[]> {
  const { titulo, temas = [], pilar = 'autoridade', slides = 8 } = params
  const total = Math.max(2, Math.min(slides, 10))
  const buffers: Buffer[] = []

  for (let i = 1; i <= total; i++) {
    const isCta = i === total
    const tema = temas[i - 1]
    buffers.push(await renderSlide({
      titulo: isCta ? 'Agende sua consulta' : (tema ?? titulo),
      descricao: isCta ? 'wa.me/VU5FBAPZBRCTO1' : (i > 1 && !tema ? `${i}/${total}` : undefined),
      badge: 'Dr. Vinícius Cechella',
      pilar,
      slide_number: i,
      total_slides: total,
      is_cta: isCta,
    }))
  }

  return buffers
}
