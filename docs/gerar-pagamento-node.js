// ═══════════════════════════════════════════════════════════════
// NÓ: Gerar Pagamento — workflow principal
// Só executa se etapa_agente = 6
// Suporta PIX e Cartão de Crédito
// Para cartão: gera link único /pagar/[token] e envia via WhatsApp
// Para PIX: gera QR code e envia código copia-e-cola
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtc2Jsc29xcWh0YW50eW9taHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTI5MDgsImV4cCI6MjA5NjQ2ODkwOH0.PAje_eA_dYrwM_5f-4n9MMDY-GGtC0ZzEdRn7W3gg30';
const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text';
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS';
const MP_TOKEN = 'APP_USR-1603783113978504-062408-d67a1021538897e0341f70bb7645fdcf-2669863266';
const SITE_URL = 'https://hormoneecosystem.vercel.app';

// Valores de TESTE — trocar para produção: PIX=5000, CARTAO=5000
const VALOR_PIX = 1;
const VALOR_CARTAO = 1.00;

const extrairMsg = $('Extrair Mensagem').item.json;
const telefone = extrairMsg.telefone || '';

if (!telefone) {
  return [{ json: { pagamento_gerado: false, motivo: 'telefone_vazio' } }];
}

// Buscar lead: etapa, nome e método de pagamento escolhido
let etapaReal = 0;
let nomeReal = 'você';
let metodoPagamento = 'pix'; // padrão
try {
  const leadResp = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/leads?telefone=eq.${telefone}&select=etapa_agente,nome,metodo_pagamento`,
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  etapaReal = leadResp?.[0]?.etapa_agente || 0;
  nomeReal = leadResp?.[0]?.nome || 'você';
  metodoPagamento = leadResp?.[0]?.metodo_pagamento || 'pix';
} catch(e) {}

if (etapaReal !== 6) {
  return [{ json: { pagamento_gerado: false, motivo: 'etapa_incorreta', etapa_atual: etapaReal } }];
}

// ══════════════════════════════════════════
// CAMINHO 1: CARTÃO DE CRÉDITO
// ══════════════════════════════════════════
if (metodoPagamento === 'cartao') {
  // Gerar token único para o link
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const linkPagamento = `${SITE_URL}/pagar/${token}`;

  // Salvar token no lead
  try {
    await this.helpers.httpRequest({
      method: 'PATCH',
      url: `${SUPABASE_URL}/rest/v1/leads?telefone=eq.${telefone}`,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ payment_token: token, tentativas_pagamento: 0 }),
    });
  } catch(e) {}

  // Enviar link via WhatsApp
  await this.helpers.httpRequest({
    method: 'POST',
    url: ZAPI_URL,
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
    body: JSON.stringify({
      phone: telefone,
      message: `Seu acesso está quase liberado! 🎉\n\nClique aqui para finalizar com segurança 👇\n${linkPagamento}\n\n🔒 Ambiente 100% seguro — Mercado Pago`
    })
  });

  return [{ json: { pagamento_gerado: true, metodo: 'cartao', link: linkPagamento, telefone } }];
}

// ══════════════════════════════════════════
// CAMINHO 2: PIX (lógica original)
// ══════════════════════════════════════════
const agora = new Date().toISOString();

// Verificar se já tem PIX ativo
let checkResp = [];
try {
  checkResp = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/pagamentos?lead_telefone=eq.${telefone}&status=eq.pending&metodo=eq.pix&expira_em=gt.${agora}&order=created_at.desc&limit=1`,
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
} catch(e) {}

let pixCode, paymentId, expiraEm, qrBase64;

if (Array.isArray(checkResp) && checkResp.length > 0) {
  const pixExistente = checkResp[0];
  pixCode = pixExistente.pix_code;
  paymentId = pixExistente.payment_id;
  expiraEm = pixExistente.expira_em;
  const minutosRestantes = Math.ceil((new Date(expiraEm) - new Date()) / 60000);

  await this.helpers.httpRequest({
    method: 'POST', url: ZAPI_URL,
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
    body: JSON.stringify({ phone: telefone, message: `✅ Seu PIX ainda está ativo!\n\n⏳ Expira em ${minutosRestantes} minutos\n\nCopia e Cola PIX abaixo 👇` })
  });
} else {
  // Gerar novo PIX no Mercado Pago
  let pixResp;
  try {
    pixResp = await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://api.mercadopago.com/v1/payments',
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `pix-${telefone}-${Date.now()}`
      },
      body: JSON.stringify({
        transaction_amount: VALOR_PIX,
        description: 'Programa Hormonal Dr. Vinicius',
        payment_method_id: 'pix',
        payer: { email: 'pagador@hormoneecosystem.com' },
        metadata: { telefone }
      })
    });
  } catch (err) {
    return [{ json: { pagamento_gerado: false, erro: 'falhou_mercadopago', detalhe: String(err) } }];
  }

  pixCode = pixResp?.point_of_interaction?.transaction_data?.qr_code || '';
  qrBase64 = pixResp?.point_of_interaction?.transaction_data?.qr_code_base64 || '';
  paymentId = String(pixResp?.id || '');
  expiraEm = pixResp?.date_of_expiration || new Date(Date.now() + 30 * 60 * 1000).toISOString();

  if (!pixCode) {
    return [{ json: { pagamento_gerado: false, erro: 'pix_code_vazio', mp_response: pixResp } }];
  }

  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: `${SUPABASE_URL}/rest/v1/pagamentos`,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        lead_telefone: telefone,
        payment_id: paymentId,
        metodo: 'pix',
        valor: VALOR_PIX,
        status: 'pending',
        pix_code: pixCode,
        qr_code_base64: qrBase64,
        expira_em: expiraEm,
        parcelas: 1,
        recorrente: false
      })
    });
  } catch(errSupabase) {}

  await this.helpers.httpRequest({
    method: 'POST', url: ZAPI_URL,
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
    body: JSON.stringify({ phone: telefone, message: `🏦 Pagamento gerado!\n\nCopia e Cola PIX abaixo 👇` })
  });
}

// Mensagem 2: código PIX limpo
await this.helpers.httpRequest({
  method: 'POST', url: ZAPI_URL,
  headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
  body: JSON.stringify({ phone: telefone, message: pixCode })
});

// Mensagem 3: instrução final
await this.helpers.httpRequest({
  method: 'POST', url: ZAPI_URL,
  headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
  body: JSON.stringify({ phone: telefone, message: `Após pagar, me avise aqui! 🎯` })
});

return [{ json: { pagamento_gerado: true, metodo: 'pix', mensagem_enviada: true, telefone, payment_id: paymentId } }];
