import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ZAPI_SEND = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text'
const ZAPI_CLIENT_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    let telefone: string | undefined
    let mensagem: string | undefined

    if (body.message?.type === 'tool-calls') {
      const tool = body.message.toolCallList?.find((t: any) => t.function?.name === 'send_whatsapp')
      if (tool) {
        const params = JSON.parse(tool.function?.arguments || '{}')
        telefone = params.telefone
        mensagem = params.mensagem
      }
    } else if (body.message?.type === 'function-call') {
      const params = body.message.functionCall?.parameters || {}
      telefone = params.telefone
      mensagem = params.mensagem
    } else {
      telefone = body.telefone
      mensagem = body.mensagem
    }

    if (!telefone || !mensagem) {
      return NextResponse.json({ result: 'Erro: telefone e mensagem são obrigatórios.' })
    }

    const digits = String(telefone).replace(/\D/g, '')
    const phone = digits.startsWith('55') ? digits : `55${digits}`

    const resp = await fetch(ZAPI_SEND, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': ZAPI_CLIENT_TOKEN,
      },
      body: JSON.stringify({ phone, message: mensagem }),
    })

    if (!resp.ok) {
      return NextResponse.json({ result: 'Erro ao enviar mensagem WhatsApp.' })
    }

    return NextResponse.json({ result: 'Mensagem enviada com sucesso pelo WhatsApp.' })
  } catch (err: any) {
    console.error('send-whatsapp error:', err)
    return NextResponse.json({ result: 'Erro ao enviar mensagem WhatsApp.' })
  }
}
