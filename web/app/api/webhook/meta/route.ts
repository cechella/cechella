import { NextRequest, NextResponse } from 'next/server';

const N8N_WEBHOOK_URL = 'http://35.255.229.131:5678/webhook/meta-whatsapp';
const VERIFY_TOKEN = 'cechella2026';
const ANA_MASTER_URL = process.env.ANA_MASTER_URL || 'https://ana-master.hormoneecosystem.com';
// Phone Number ID do número Ageless (+55 47 8473-1049) — ligações do André
const ANDRE_PHONE_NUMBER_ID = '1320620911136699';

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
// Ligações WhatsApp (field=calls) são roteadas ao André via ana-master
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Detecta eventos de ligação WhatsApp Business Calling
    const entries: any[] = body?.entry ?? [];
    for (const entry of entries) {
      for (const change of (entry?.changes ?? [])) {
        if (change?.field === 'calls') {
          const phoneNumberId = change?.value?.metadata?.phone_number_id ?? '';
          const calls: any[] = change?.value?.calls ?? [];
          for (const call of calls) {
            // Só atende ligações recebidas (status=initiated) no número do André
            if (call?.status === 'initiated' && phoneNumberId === ANDRE_PHONE_NUMBER_ID) {
              const numero = call.from?.replace(/\D/g, '') ?? '';
              if (numero) {
                // Dispara André via ana-master (chama de volta via Twilio)
                fetch(`${ANA_MASTER_URL}/outbound`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    numero,
                    profile: 'andre',
                    origem: 'whatsapp_call',
                    contexto: 'pos_vendas',
                  }),
                }).catch(() => null); // fire-and-forget
              }
            }
          }
        }
      }
    }

    // Sempre repassa ao n8n para mensagens normais
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
