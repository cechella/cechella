import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// POST /api/admin/verve/caption
// Body: { titulo, pilar, tipo, slides? }
// Returns: { legenda }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { titulo, pilar, tipo, slides } = body

  if (!titulo || !pilar || !tipo) {
    return NextResponse.json({ error: 'titulo, pilar e tipo são obrigatórios' }, { status: 400 })
  }

  const pilarContext: Record<string, string> = {
    familia:    'paternidade, família, filhos, valores, legado, amor, pai presente',
    autoridade: 'medicina hormonal, implante de testosterona, longevidade, saúde masculina, Itajaí, mercado médico',
    lifestyle:  'rotina de alta performance, networking, eventos, vida equilibrada, prova social',
  }

  const tipoContext: Record<string, string> = {
    reel:      'Legenda curta e poderosa para Reel (máximo 150 caracteres na primeira linha para aparecer antes do "ver mais")',
    carrossel: `Legenda para carrossel de ${slides ?? 'vários'} slides — começa com gancho forte`,
    story:     'Call-to-action direto para Stories',
  }

  const system = `Você é o VERVE, o Diretor Autônomo de Mídia de Dr. Vinícius Cechella — médico especialista em implante de testosterona e longevidade em Itajaí/SC.

Seu objetivo: 1.000.000 seguidores no Instagram @viniciuscechella em 12 meses.

Tom de voz: direto, confiante, científico mas acessível, nunca genérico.
Escrita: português brasileiro, sem anglicismos desnecessários.
Proibido: emojis em excesso, frases clichê como "confira", "aprenda", "descubra".
Permitido: pergunta retórica de abertura, dado numérico, afirmação ousada, storytelling.

Pilar atual: ${pilar} — temas: ${pilarContext[pilar] ?? pilar}

Formato: ${tipoContext[tipo] ?? tipo}

Sempre termine com no máximo 5 hashtags de nicho relevantes (sem hashtags genéricas como #saude #vida).`

  const message = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 600,
    system,
    messages: [
      {
        role: 'user',
        content: `Crie a legenda para este post:\n\nTítulo: ${titulo}\nTipo: ${tipo}\nPilar: ${pilar}${slides ? `\nSlides: ${slides}` : ''}`,
      },
    ],
  })

  const legenda = (message.content[0] as { type: string; text: string }).text.trim()

  return NextResponse.json({ legenda })
}
