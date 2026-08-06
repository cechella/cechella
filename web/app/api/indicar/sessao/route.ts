import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ZAPI_BASE = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5'
const ZAPI_URL = `${ZAPI_BASE}/send-text`
const ZAPI_VIDEO_BTN_URL = `${ZAPI_BASE}/send-button-video`
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'
const TUTORIAL_VIDEO_URL = 'https://pub-7091151189544b0980e12e81533a5213.r2.dev/tutorialwpp.mp4'

async function enviarMensagemFollowUp(phone: string, token: string, totalAtual: number) {
  const faltam = Math.max(0, 20 - totalAtual)
  if (faltam === 0) return // já completou, não precisa

  const link = `https://www.hormoneecosystem.com/indicar/${token}`
  const mensagem = faltam === 1
    ? `💜 Quase lá! Você enviou ${totalAtual} contatos — falta só *1* para completar!\n\nAcesse seu link e envie mais uma amiga:\n👉 ${link}`
    : `💜 Ótimo progresso! Você enviou *${totalAtual} contatos* — faltam *${faltam}* para completar as 20.\n\nAcesse seu link e envie mais:\n👉 ${link}`

  try {
    await fetch(ZAPI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
      body: JSON.stringify({ phone, message: mensagem }),
    })
  } catch {
    // Não bloqueia o fluxo se falhar
  }
}

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
      const { data: existente } = await supabase
        .from('sessao_wpp')
        .select('token')
        .eq('phone', phone)
        .maybeSingle()

      await supabase
        .from('sessao_wpp')
        .upsert({ phone, token: body.token }, { onConflict: 'phone' })

      // Envia tutorial em vídeo se for a primeira vez OU se o token mudou (novo link)
      const tokenMudou = !existente || existente.token !== body.token
      if (tokenMudou) {
        const link = `https://www.hormoneecosystem.com/indicar/${body.token}`
        try {
          await fetch(ZAPI_VIDEO_BTN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
            body: JSON.stringify({
              phone,
              caption: '✅ Código recebido! Assista ao tutorial e siga os passos para compartilhar suas amigas 💜',
              video: TUTORIAL_VIDEO_URL,
              buttons: [{ label: '📲 Abrir meu link de indicação', id: link }],
            }),
          })
        } catch {}
      }

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

      const normTel = (t: any) => String(t || '').replace(/\D/g, '').replace(/^0+/, '')
      const existentes: any[] = atual?.contatos || []
      const novos: any[] = body.contatos || []

      // 1. Deduplica novos entre si (mesmo lote pode ter mesmo número com nomes diferentes)
      const novosDedup: any[] = Object.values(
        novos.reduce((acc: any, c: any) => {
          const key = normTel(c.telefone)
          if (key && key.length >= 8) acc[key] = c
          return acc
        }, {})
      )

      // 2. Deduplica novos contra existentes (normaliza formato antes de comparar)
      const telefonesExistentes = new Set(existentes.map((c: any) => normTel(c.telefone)))
      const merged = [
        ...existentes,
        ...novosDedup.filter((c: any) => !telefonesExistentes.has(normTel(c.telefone)))
      ].slice(0, 20)

      await supabase
        .from('sessao_wpp')
        .update({ contatos: merged })
        .eq('phone', phone)

      // Envia follow-up automático se ainda faltam contatos
      await enviarMensagemFollowUp(phone, sessao.token, merged.length)

      return NextResponse.json({ ok: true, step: 'contacts_saved', token: sessao.token, total: merged.length })
    }

    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
