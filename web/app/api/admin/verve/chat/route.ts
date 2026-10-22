import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/verve/admin-auth'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// POST /api/admin/verve/chat
// Body: { messages: [{role: 'user'|'assistant', content: string}] }
// Returns: { reply: string }
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req)
  if (!auth.ok) return auth.response

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 503 })
  }

  const body = await req.json()
  const { messages } = body
  if (!Array.isArray(messages) || !messages.length) {
    return NextResponse.json({ error: 'messages é obrigatório' }, { status: 400 })
  }

  // Busca contexto atual: briefings pendentes + posts desta semana
  const [{ data: briefings }, { data: posts }] = await Promise.all([
    supabase.from('verve_briefings').select('titulo, objetivo, status, semana').order('created_at', { ascending: false }).limit(5),
    supabase.from('verve_posts').select('titulo, tipo, pilar, status, scheduled_at').order('scheduled_at', { ascending: true }).limit(10),
  ])

  const contexto = [
    briefings?.length
      ? `Briefings recentes:\n${briefings.map(b => `- [${b.status}] ${b.titulo} (semana ${b.semana})`).join('\n')}`
      : 'Nenhum briefing registrado ainda.',
    posts?.length
      ? `Posts desta semana:\n${posts.map(p => `- [${p.status}] ${p.tipo} "${p.titulo}" — ${p.pilar} · ${p.scheduled_at?.slice(0, 10) ?? ''}`).join('\n')}`
      : 'Nenhum post agendado.',
  ].join('\n\n')

  const system = `Você é o VERVE — Diretor Autônomo de Mídia de Dr. Vinícius Cechella, médico especialista em implante de testosterona e longevidade em Itajaí/SC. Objetivo: 1.000.000 seguidores no Instagram @viniciuscechella em 12 meses.

Você fala diretamente com o Dr. Vinícius (CEO). Seja direto, estratégico, sem rodeios. Quando ele perguntar sobre o plano da semana, briefings ou posts, use o contexto abaixo. Quando ele pedir algo que você pode executar (gerar legenda, sugerir pauta, criar briefing), faça imediatamente. Quando ele mencionar o Gustavo, lembre que é o agente de WhatsApp que traz propostas de briefing.

Tom: parceiro estratégico de confiança, não assistente. Responda em português brasileiro.

Contexto atual:
${contexto}`

  const client = new Anthropic()
  const response = await client.messages.create({
    model: process.env.VERVE_CAPTION_MODEL ?? 'claude-sonnet-5-5',
    max_tokens: 1024,
    system,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  })

  const reply = (response.content[0] as { type: string; text: string }).text.trim()
  return NextResponse.json({ reply })
}
