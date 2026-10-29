import { dbSupabase } from '@/lib/ebook/db'
import { clienteMP } from '@/lib/ebook/mp'
import type { Ctx } from '@/lib/ebook/service'

export const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.hormoneecosystem.com'
export function contexto(): Ctx {
  return {
    db: dbSupabase(), mp: clienteMP(process.env.MP_ACCESS_TOKEN), agora: () => new Date(),
    opc: { precoEsperado: process.env.EBOOK_PRECO_CENTAVOS, collectorId: process.env.MP_COLLECTOR_ID, siteUrl: SITE, ambiente: process.env.EBOOK_AMBIENTE === 'teste' ? 'teste' : 'real' },
  }
}
