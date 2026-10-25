// Composita texto sobre foto usando satori (JSX→SVG) + @resvg/resvg-js (SVG→PNG).
// Sem Playwright — compatível com Vercel Hobby (cada slide ~200-400ms).
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { FRAUNCES_700_B64 } from './font-fraunces700'
import { INSTRUMENT_400_B64 } from './font-instrument400'
import { KIT, papelDoSlide, tamanhosDeTexto, CHIPS_FECHO, SETA_DESLIZE } from './brand-kit'

export interface SlideContent {
  titulo: string
  descricao?: string
  badge?: string          // ex: "PARA HOMENS DE 40 A 60 ANOS"
  slideNum: number        // 1-based
  totalSlides: number
  imageBuffer: Buffer     // foto gerada pelo Flux (jpeg)
  isCta?: boolean
  layout?: 'kit' | 'classico'   // padrão: kit de marca; 'classico' é o layout anterior (foto cheia com gradiente)
}

const W = 1080
const H = 1350

function imageToDataUri(buf: Buffer): string {
  return `data:image/jpeg;base64,${buf.toString('base64')}`
}

// Satori só lê TTF/OTF/WOFF estáticos (NÃO WOFF2). As fontes ficam embutidas no código (font-*.ts): sem rede, sem arquivo a rastrear no deploy.
const fontFraunces700: Buffer = Buffer.from(FRAUNCES_700_B64, 'base64')
const fontInstrument400: Buffer = Buffer.from(INSTRUMENT_400_B64, 'base64')

// Layout do KIT DE MARCA: foto no alto, bloco liso de texto na parte de baixo (sempre no mesmo lugar), linha champanhe e assinatura fixas.
function elementoKit(content: SlideContent) {
  const { titulo, descricao, badge, slideNum, totalSlides, imageBuffer, isCta = false } = content
  const papel = papelDoSlide(slideNum, totalSlides, isCta)
  const tam = tamanhosDeTexto(titulo, descricao)
  const c = KIT.cores
  const chip = (texto: string, cheio = true) => ({
    type: 'div',
    props: {
      style: { display: 'flex', backgroundColor: cheio ? c.chipFundo : 'transparent', border: cheio ? 'none' : `2px solid ${c.destaque}`, borderRadius: 999, padding: '10px 24px', fontSize: 20, fontWeight: 600, letterSpacing: 1.2, color: cheio ? c.chipTexto : c.destaque },
      children: texto,
    },
  })
  const filhosPainel = [
    badge && papel === 'capa' ? { type: 'div', props: { style: { display: 'flex', alignSelf: 'flex-start' }, children: chip(badge.toUpperCase()) } } : null,
    { type: 'div', props: { style: { fontFamily: KIT.fonteTitulo, fontSize: tam.titulo, fontWeight: 700, lineHeight: 1.02, color: c.texto, letterSpacing: -1 }, children: titulo } },
    descricao ? { type: 'div', props: { style: { fontSize: tam.descricao, lineHeight: 1.38, color: c.textoSuave }, children: descricao } } : null,
    papel === 'capa' ? {
      type: 'div', props: { style: { display: 'flex', alignItems: 'center', gap: 18, marginTop: 6 }, children: [
        { type: 'span', props: { style: { fontSize: 22, fontWeight: 600, letterSpacing: 3, color: c.destaque }, children: 'DESLIZE' } },
        { type: 'img', props: { src: SETA_DESLIZE, width: 120, height: 36 } },
      ] },
    } : null,
    papel === 'fecho' ? { type: 'div', props: { style: { display: 'flex', gap: 14, marginTop: 6 }, children: CHIPS_FECHO.map(t => chip(t, false)) } } : null,
  ].filter(Boolean)

  return {
    type: 'div',
    props: {
      style: { width: W, height: H, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', backgroundColor: '#111', fontFamily: KIT.fonteTexto },
      children: [
        { type: 'img', props: { src: imageToDataUri(imageBuffer), style: { position: 'absolute', top: 0, left: 0, width: W, height: H, objectFit: 'cover' } } },
        // sombra suave só atrás do bloco, para o painel não "flutuar" sobre fotos claras
        { type: 'div', props: { style: { position: 'absolute', bottom: 0, left: 0, width: W, height: 760, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)' } } },
        // número do slide
        { type: 'div', props: { style: { position: 'absolute', top: 48, right: KIT.margem, display: 'flex', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, padding: '8px 20px', fontSize: 20, fontWeight: 600, letterSpacing: 1.5, color: '#fff' }, children: `${String(slideNum).padStart(2, '0')} / ${String(totalSlides).padStart(2, '0')}` } },
        // bloco de texto
        { type: 'div', props: { style: { position: 'absolute', left: KIT.margem, right: KIT.margem, bottom: 178, display: 'flex', flexDirection: 'column', gap: 20, padding: '40px 44px', backgroundColor: c.painel, border: `2px solid ${c.painelBorda}`, borderRadius: KIT.painelRaio }, children: filhosPainel } },
        // linha champanhe + assinatura (iguais em todos os slides)
        { type: 'div', props: { style: { position: 'absolute', bottom: 56, left: KIT.margem, right: KIT.margem, display: 'flex', flexDirection: 'column', gap: 12 }, children: [
          { type: 'div', props: { style: { height: 3, width: 120, backgroundColor: c.destaque } } },
          { type: 'div', props: { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [
            { type: 'div', props: { style: { display: 'flex', flexDirection: 'column', gap: 2 }, children: [
              { type: 'span', props: { style: { fontSize: 22, fontWeight: 600, letterSpacing: 1.6, color: '#fff' }, children: 'DR. VINÍCIUS CECHELLA' } },
              { type: 'span', props: { style: { fontSize: 15, fontWeight: 600, letterSpacing: 1.6, color: 'rgba(255,255,255,0.7)' }, children: 'MÉDICO · CRM-SC 38765' } },
            ] } },
            { type: 'span', props: { style: { fontSize: 16, fontWeight: 600, letterSpacing: 2, color: c.destaque }, children: 'HORMONE ECOSYSTEM' } },
          ] } },
        ] } },
      ],
    },
  }
}

export async function composeSlide(content: SlideContent): Promise<Buffer> {
  if ((content.layout ?? 'kit') === 'kit') {
    const svgKit = await satori(elementoKit(content) as Parameters<typeof satori>[0], {
      width: W, height: H,
      fonts: [
        { name: 'Fraunces', data: fontFraunces700, weight: 700, style: 'normal' },
        { name: 'Instrument Sans', data: fontInstrument400, weight: 400, style: 'normal' },
      ],
    })
    return Buffer.from(new Resvg(svgKit, { fitTo: { mode: 'width', value: W } }).render().asPng())
  }
  const { titulo, descricao, badge, slideNum, totalSlides, imageBuffer, isCta = false } = content

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
                    fontSize: 34, lineHeight: 1.45, fontWeight: 400,
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
      { name: 'Fraunces',       data: fontFraunces700,   weight: 700, style: 'normal' },
      { name: 'Instrument Sans', data: fontInstrument400, weight: 400, style: 'normal' },
    ],
  })

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: W } })
  return Buffer.from(resvg.render().asPng())
}
