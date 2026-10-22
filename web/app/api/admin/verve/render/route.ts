import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { renderSlide } from '@/lib/verve/render-slide'

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

    const pngBuffer = await renderSlide({ titulo, descricao, badge, pilar, slide_number, total_slides })
    const base64 = pngBuffer.toString('base64')
    const dataUrl = `data:image/png;base64,${base64}`

    return NextResponse.json({ dataUrl, width: 1080, height: 1350 })
  } catch (err) {
    console.error('[verve/render]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
