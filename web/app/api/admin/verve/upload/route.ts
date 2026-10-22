import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { put } from '@vercel/blob'

// POST /api/admin/verve/upload
// multipart/form-data: files[] (imagens do carrossel)
// Retorna: { urls: string[] }
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response
  const formData = await req.formData()
  const files = formData.getAll('files') as File[]

  if (!files.length) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  }

  const urls: string[] = []

  for (const file of files) {
    const blob = await put(`verve/${Date.now()}-${file.name}`, file, {
      access: 'public',
      contentType: file.type || 'image/jpeg',
    })
    urls.push(blob.url)
  }

  return NextResponse.json({ urls })
}
