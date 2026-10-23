// Composita texto sobre foto usando satori (JSX→SVG) + @resvg/resvg-js (SVG→PNG).
// Sem Playwright — compatível com Vercel Hobby (cada slide ~200-400ms).
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

export interface SlideContent {
  titulo: string
  descricao?: string
  badge?: string          // ex: "PARA HOMENS DE 40 A 60 ANOS"
  slideNum: number        // 1-based
  totalSlides: number
  imageBuffer: Buffer     // foto gerada pelo Flux (jpeg)
  isCta?: boolean
}

const W = 1080
const H = 1350

function imageToDataUri(buf: Buffer): string {
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

// Satori não suporta fontes do Google Fonts via URL — precisamos do buffer da fonte.
// Carregamos uma vez e reutilizamos.
let fontFraunces700: Buffer | null = null
let fontInstrument400: Buffer | null = null

async function loadFonts() {
  if (fontFraunces700 && fontInstrument400) return

  const [f1, f2] = await Promise.all([
    fetch('https://fonts.gstatic.com/s/fraunces/v31/6NUu8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Bg.woff2').then(r => r.arrayBuffer()),
    fetch('https://fonts.gstatic.com/s/instrumentsans/v1/pxiTypc9vsFDm051Uf6KVwgkfoSxQ0GrkiZonA.woff2').then(r => r.arrayBuffer()),
  ])
  fontFraunces700   = Buffer.from(f1)
  fontInstrument400 = Buffer.from(f2)
}

export async function composeSlide(content: SlideContent): Promise<Buffer> {
  const { titulo, descricao, badge, slideNum, totalSlides, imageBuffer, isCta = false } = content

  await loadFonts()

  const imgDataUri = imageToDataUri(imageBuffer)
  const numStr = String(slideNum).padStart(2, '0')
  const totalStr = String(totalSlides).padStart(2, '0')

  // JSX-like object tree para satori (React.createElement format)
  const element = {
    type: 'div',
    props: {
      style: {
        width: W, height: H,
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden',
        backgroundColor: '#111',
        fontFamily: 'Instrument Sans',
      },
      children: [
        // Foto de fundo
        {
          type: 'img',
          props: {
            src: imgDataUri,
            style: {
              position: 'absolute', top: 0, left: 0,
              width: W, height: H, objectFit: 'cover',
            },
          },
        },
        // Gradiente escuro (overlay bottom)
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', bottom: 0, left: 0,
              width: W, height: 900,
              background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%)',
            },
          },
        },
        // Gradiente lateral esquerdo
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', top: 0, left: 0,
              width: 400, height: H,
              background: 'linear-gradient(to right, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 100%)',
            },
          },
        },

        // TOP BAR
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', top: 52, left: 52, right: 52,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            },
            children: [
              // Pill @viniciuscechella
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex', alignItems: 'center', gap: 10,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 999,
                    padding: '10px 22px',
                  },
                  children: [
                    // dot verde
                    { type: 'div', props: { style: { width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4ade80' } } },
                    { type: 'span', props: { style: { fontSize: 20, fontWeight: 500, color: '#fff', letterSpacing: 0.3 }, children: '@viniciuscechella' } },
                  ],
                },
              },
              // Número do slide
              { type: 'span', props: { style: { fontSize: 20, fontWeight: 500, color: '#fff', letterSpacing: 1 }, children: `${numStr} / ${totalStr}` } },
            ],
          },
        },

        // CONTEÚDO CENTRAL (bottom-left)
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', bottom: 160, left: 52, right: 52,
              display: 'flex', flexDirection: 'column', gap: 24,
            },
            children: [
              // Badge
              badge ? {
                type: 'div',
                props: {
                  style: {
                    display: 'flex', alignSelf: 'flex-start',
                    backgroundColor: '#fff',
                    borderRadius: 999,
                    padding: '8px 20px',
                    fontSize: 15, fontWeight: 600, letterSpacing: 0.8,
                    color: '#1a1a1a',
                  },
                  children: badge.toUpperCase(),
                },
              } : null,
              // Título Fraunces
              {
                type: 'div',
                props: {
                  style: {
                    fontFamily: 'Fraunces',
                    fontSize: isCta ? 58 : 62,
                    fontWeight: 700,
                    lineHeight: 0.95,
                    color: '#fff',
                    letterSpacing: -1,
                  },
                  children: titulo,
                },
              },
              // Descrição
              descricao ? {
                type: 'div',
                props: {
                  style: {
                    fontSize: 22, lineHeight: 1.45, fontWeight: 400,
                    color: 'rgba(255,255,255,0.88)',
                  },
                  children: descricao,
                },
              } : null,
            ].filter(Boolean),
          },
        },

        // ASSINATURA
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute', bottom: 60, left: 52, right: 52,
              display: 'flex', flexDirection: 'column', gap: 10,
            },
            children: [
              // Linha
              { type: 'div', props: { style: { height: 1, backgroundColor: 'rgba(255,255,255,0.25)', width: '100%' } } },
              // Footer row
              {
                type: 'div',
                props: {
                  style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: { display: 'flex', flexDirection: 'column', gap: 2 },
                        children: [
                          { type: 'span', props: { style: { fontSize: 18, fontWeight: 600, letterSpacing: 1.2, color: '#fff' }, children: 'DR. VINÍCIUS CECHELLA' } },
                          { type: 'span', props: { style: { fontSize: 13, fontWeight: 600, letterSpacing: 1.5, color: 'rgba(255,255,255,0.6)' }, children: 'MÉDICO · CRM-SC 38765' } },
                        ],
                      },
                    },
                    { type: 'span', props: { style: { fontSize: 14, fontWeight: 600, letterSpacing: 1.5, color: 'rgba(255,255,255,0.7)' }, children: 'HORMONE ECOSYSTEM' } },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  }

  const svg = await satori(element as Parameters<typeof satori>[0], {
    width: W,
    height: H,
    fonts: [
      { name: 'Fraunces',       data: fontFraunces700!,   weight: 700, style: 'normal' },
      { name: 'Instrument Sans', data: fontInstrument400!, weight: 400, style: 'normal' },
    ],
  })

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: W } })
  return Buffer.from(resvg.render().asPng())
}
