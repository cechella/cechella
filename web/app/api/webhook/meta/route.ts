import { NextRequest, NextResponse } from 'next/server';

const N8N_WEBHOOK_URL = 'http://35.255.229.131:5678/webhook/meta-whatsapp';
const VERIFY_TOKEN = 'cechella2026';

// GET — verificação do Meta (handshake inicial)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// POST — recebe mensagens/eventos do Meta e repassa ao n8n
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ status: 'error' }, { status: 200 }); // sempre 200 para o Meta não retentar
  }
}
