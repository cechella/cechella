import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/verve/admin-auth'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

// POST /api/admin/verve/render
// Body: { titulo, descricao, badge, pilar, slide_number, total_slides }
// Returns: PNG 1080x1350 as base64 + data URL

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response
  try {
    const body = await req.json()
    const {
      titulo = 'Título do post',
      descricao = '',
      badge = 'HORMONE ECOSYSTEM',
      pilar = 'autoridade',
      slide_number = 1,
      total_slides = 1,
    } = body

    const pilarColors: Record<string, { bg: string; accent: string }> = {
      familia:    { bg: '#0d0718', accent: '#a855f7' },
      autoridade: { bg: '#080f1a', accent: '#3b82f6' },
      lifestyle:  { bg: '#120a05', accent: '#f97316' },
    }
    const colors = pilarColors[pilar] ?? pilarColors.autoridade

    // Satori JSX element (React-like object syntax)
    const element = {
      type: 'div',
      props: {
        style: {
          width: 1080,
          height: 1350,
          background: colors.bg,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          fontFamily: 'sans-serif',
          position: 'relative',
        },
        children: [
          // Top: badge + slide counter
          {
            type: 'div',
            props: {
              style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 22,
                      fontWeight: 700,
                      color: colors.accent,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                    },
                    children: badge,
                  },
                },
                total_slides > 1 ? {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 22,
                      color: 'rgba(255,255,255,0.3)',
                      fontWeight: 500,
                    },
                    children: `${slide_number} / ${total_slides}`,
                  },
                } : null,
              ].filter(Boolean),
            },
          },
          // Center: main title
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
                flex: 1,
                justifyContent: 'center',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: titulo.length > 40 ? 72 : 88,
                      fontWeight: 800,
                      color: '#ffffff',
                      lineHeight: 1.1,
                      letterSpacing: '-0.02em',
                    },
                    children: titulo,
                  },
                },
                descricao ? {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 36,
                      color: 'rgba(255,255,255,0.6)',
                      lineHeight: 1.5,
                      fontWeight: 400,
                    },
                    children: descricao,
                  },
                } : null,
              ].filter(Boolean),
            },
          },
          // Bottom: accent line + Dr. name
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', gap: 16 },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      height: 4,
                      width: 80,
                      background: colors.accent,
                      borderRadius: 2,
                    },
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 28,
                      color: 'rgba(255,255,255,0.4)',
                      fontWeight: 500,
                    },
                    children: 'Dr. Vinícius Cechella',
                  },
                },
              ],
            },
          },
        ],
      },
    }

    // Carrega Inter Bold do Google Fonts — satori exige pelo menos uma fonte
    const fontRes = await fetch(
      'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZBiA.woff2',
      { next: { revalidate: 86400 } }
    )
    const fontData = await fontRes.arrayBuffer()

    const svg = await satori(element as Parameters<typeof satori>[0], {
      width: 1080,
      height: 1350,
      fonts: [{ name: 'Inter', data: fontData, weight: 700, style: 'normal' }],
    })

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1080 } })
    const pngData = resvg.render()
    const pngBuffer = pngData.asPng()
    const base64 = Buffer.from(pngBuffer).toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`

    return NextResponse.json({ dataUrl, width: 1080, height: 1350 })
  } catch (err) {
    console.error('[verve/render]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
