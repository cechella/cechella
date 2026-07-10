import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const N8N_WEBHOOK_URL = 'https://www.hormoneecosystem.com/api/n8n-proxy'

// ManyChat envia POST quando lead comenta "implante" no Instagram e fornece telefone
// Payload esperado: { subscriber: { first_name, last_name, phone, email }, custom_fields: {...} }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Suporte a dois formatos: ManyChat padrão e payload simplificado
    const subscriber = body.subscriber || body
    const nome = [subscriber.first_name, subscriber.last_name].filter(Boolean).join(' ').trim()
      || subscriber.nome
      || 'Lead Instagram'

    // Normalizar telefone — remover tudo exceto dígitos
    const rawPhone = subscriber.phone || subscriber.telefone || ''
    const telefone = rawPhone.replace(/\D/g, '')

    if (!telefone) {
      return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 })
    }

    const origem = body.utm_source || body.source || 'instagram'

    // Salvar/atualizar lead no Supabase
    const { data: lead, error } = await supabase
      .from('leads')
      .upsert(
        {
          telefone,
          nome,
          email: subscriber.email || null,
          origem,
          etapa_agente: 1,
          temperatura: 'quente',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'telefone' }
      )
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Acionar Ana via n8n — envia primeiro contato no WhatsApp
    try {
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefone,
          nome,
          origem,
          etapa_agente: 1,
          trigger: 'manychat_instagram',
          mensagem: `Oi! Vi seu interesse no implante hormonal pelo Instagram 😊`,
        }),
        signal: AbortSignal.timeout(8000),
      })
    } catch {
      // n8n indisponível — lead já foi salvo, Ana vai atender quando receber mensagem
    }

    return NextResponse.json({ success: true, lead_id: lead?.id })
  } catch (err: any) {
    console.error('ManyChat webhook error:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Verificação de conectividade — ManyChat testa o endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'hormone-ecosystem-manychat' })
}
