import { NextRequest, NextResponse } from 'next/server'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { contexto } from '../_ctx'
import { liberarDownload } from '@/lib/ebook/service'
import { segredoConfere } from '@/lib/ebook/core'
import { r2, R2_BUCKET } from '@/lib/r2'

export const dynamic = 'force-dynamic'

// Entrega: só o dono de um pedido PAGO recebe o link (10 min) do arquivo da versão comprada. Pode repetir à vontade: reenvia sem nova cobrança.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') || '', t = req.nextUrl.searchParams.get('t') || ''
  try {
    const r = await liberarDownload(contexto(), id, t,
      key => getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: key, ResponseContentDisposition: 'attachment; filename="ebook-ia-pmes.pdf"' }), { expiresIn: 600 }), segredoConfere)
    if (!r.ok) return NextResponse.json({ erro: r.erro }, { status: r.status })
    return NextResponse.redirect(r.url, 302)
  } catch { return NextResponse.json({ erro: 'indisponivel' }, { status: 503 }) }
}
