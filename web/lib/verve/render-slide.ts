import path from 'path'
import fs from 'fs'

// URLs das fotos premium hospedadas no Vercel Blob.
// Para adicionar/alterar fotos, faça upload via script scripts/upload-fotos-verve.ts
// e cole as URLs resultantes aqui.
export const PHOTO_URLS: string[] = [
  // Preencher após upload: process.env.VERVE_PHOTO_1 ?? ''
  process.env.VERVE_PHOTO_1 ?? '',
  process.env.VERVE_PHOTO_2 ?? '',
  process.env.VERVE_PHOTO_3 ?? '',
  process.env.VERVE_PHOTO_4 ?? '',
  process.env.VERVE_PHOTO_5 ?? '',
  process.env.VERVE_PHOTO_6 ?? '',
].filter(Boolean)

const TEMPLATE_PATH = path.join(process.cwd(), 'lib/verve/slide-template.html')
let _template: string | null = null

function getTemplate(): string {
  if (_template) return _template
  _template = fs.readFileSync(TEMPLATE_PATH, 'utf8')
  return _template
}

function pickPhoto(index: number): string {
  if (!PHOTO_URLS.length) return ''
  return PHOTO_URLS[index % PHOTO_URLS.length]
}

function buildHtml(vars: {
  imageUrl: string
  badge: string
  title: string
  desc: string
  slideNum: string
  total: string
}): string {
  return getTemplate()
    .replace('{{IMAGE_URL}}', vars.imageUrl)
    .replace(/\{\{BADGE\}\}/g, vars.badge)
    .replace('{{TITLE}}', vars.title)
    .replace('{{DESC}}', vars.desc)
    .replace(/\{\{SLIDE_NUM\}\}/g, vars.slideNum)
    .replace('{{TOTAL}}', vars.total)
}

async function launchBrowser() {
  const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME
  if (isVercel) {
    const chromium = (await import('@sparticuz/chromium-min')).default
    const { chromium: playwright } = await import('playwright-core')
    const executablePath = await chromium.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v153.0.0/chromium-v153.0.0-pack.tar'
    )
    return playwright.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    })
  }
  const { chromium } = await import('playwright-core')
  return chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', headless: true })
}

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

export async function renderSlide(input: SlideInput): Promise<Buffer> {
  const {
    titulo,
    descricao = '',
    badge = '',
    slide_number = 1,
    total_slides = 1,
    is_cta = false,
    image_url,
  } = input

  const imageUrl = image_url ?? pickPhoto(slide_number - 1)
  const html = buildHtml({
    imageUrl,
    badge: is_cta ? '' : badge,
    title: titulo,
    desc: descricao,
    slideNum: String(slide_number).padStart(2, '0'),
    total: String(total_slides).padStart(2, '0'),
  })

  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setViewportSize({ width: 1080, height: 1350 })
    await page.setContent(html, { waitUntil: 'networkidle' })
    const png = await page.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 1350 } })
    return Buffer.from(png)
  } finally {
    await browser.close()
  }
}

export async function renderCarrossel(params: {
  titulo: string
  temas?: string[]
  pilar?: string
  slides?: number
  badge?: string
}): Promise<Buffer[]> {
  const { titulo, temas = [], slides = 8, badge = '' } = params
  const total = Math.max(2, Math.min(slides, 10))
  const buffers: Buffer[] = []

  for (let i = 1; i <= total; i++) {
    const isCta = i === total
    const tema = temas[i - 1]
    buffers.push(await renderSlide({
      titulo: isCta ? 'Agende\nsua consulta' : (tema ?? titulo),
      descricao: isCta ? '@viniciuscechella | wa.me/link' : (i > 1 && !tema ? '' : ''),
      badge: isCta ? '' : badge,
      slide_number: i,
      total_slides: total,
      is_cta: isCta,
      image_url: pickPhoto(i - 1),
    }))
  }

  return buffers
}
