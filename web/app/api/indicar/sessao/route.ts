import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET — página faz polling para ver se chegaram contatos
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ contatos: [] })

  // Suporta token salvo como string simples OU como URL completa (ex: https://.../indicar/TOKEN)
  const { data } = await supabase
    .from('sessao_wpp')
    .select('contatos')
    .or(`token.eq.${token},token.ilike.%/${token}`)
    .maybeSingle()

  return NextResponse.json(
    { contatos: data?.contatos || [] },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Pragma': 'no-cache' } }
  )
}

// POST — n8n chama quando recebe mensagem do WhatsApp
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Passo 1: paciente enviou "REF-TOKEN" → salva mapeamento phone→token
    if (body.phone && body.token) {
      const phone = String(body.phone).replace(/\D/g, '')
      await supabase
        .from('sessao_wpp')
        .upsert({ phone, token: body.token }, { onConflict: 'phone' })
      return NextResponse.json({ ok: true, step: 'registered' })
    }

    // Passo 2: paciente enviou contatos → busca token pelo phone e salva contatos
    if (body.phone && body.contatos) {
      const phone = String(body.phone).replace(/\D/g, '')
      const { data: sessao } = await supabase
        .from('sessao_wpp')
        .select('token')
        .eq('phone', phone)
        .maybeSingle()

      if (!sessao?.token) {
        return NextResponse.json({ error: 'Sessão não encontrada. Paciente deve enviar REF-TOKEN primeiro.' }, { status: 404 })
      }

      // Busca contatos existentes e acumula (sem duplicar por telefone)
      const { data: atual } = await supabase
        .from('sessao_wpp')
        .select('contatos')
        .eq('phone', phone)
        .maybeSingle()

      const existentes: any[] = atual?.contatos || []
      const novos: any[] = body.contatos || []
      const telefonesExistentes = new Set(existentes.map((c: any) => c.telefone))
      const merged = [...existentes, ...novos.filter((c: any) => !telefonesExistentes.has(c.telefone))].slice(0, 20)

      await supabase
        .from('sessao_wpp')
        .update({ contatos: merged })
        .eq('phone', phone)

      return NextResponse.json({ ok: true, step: 'contacts_saved', token: sessao.token })
    }

    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
