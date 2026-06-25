// ═══════════════════════════════════════════════════════════════
// NÓ: Gerar Pagamento — workflow principal
// Só executa se etapa_agente = 6
// Verifica PIX ativo antes de gerar novo
// Envia 3 mensagens separadas via Z-API:
//   1. Confirmação (texto)
//   2. Código PIX limpo (fácil de copiar)
//   3. Instrução final
// metadata.telefone incluído no pagamento MP para webhook identificar o lead
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtc2Jsc29xcWh0YW50eW9taHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTI5MDgsImV4cCI6MjA5NjQ2ODkwOH0.PAje_eA_dYrwM_5f-4n9MMDY-GGtC0ZzEdRn7W3gg30';
const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text';
const ZAPI_TOKEN = 'F1b8ffae44d794f31bbab006821cdb31c5';
const MP_TOKEN = 'APP_USR-1603783113978504-062408-d67a1021538897e0341f70bb7645fdcf-2669863266';

const extrairMsg = $('Extrair Mensagem').item.json;
const telefone = extrairMsg.telefone || '';

if (!telefone) {
  return [{ json: { pagamento_gerado: false, motivo: 'telefone_vazio' } }];
}

let etapaReal = 0;
let nomeReal = 'você';
try {
  const leadResp = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/leads?telefone=eq.${telefone}&select=etapa_agente,nome`,
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  etapaReal = leadResp?.[0]?.etapa_agente || 0;
  nomeReal = leadResp?.[0]?.nome || 'você';
} catch(e) {}

if (etapaReal !== 6) {
  return [{ json: { pagamento_gerado: false, motivo: 'etapa_incorreta', etapa_atual: etapaReal } }];
}

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

  // Mensagem 1: status do PIX existente
  await this.helpers.httpRequest({
    method: 'POST', url: ZAPI_URL,
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
    body: { phone: telefone, message: `✅ Seu PIX ainda está ativo!\n\n⏳ Expira em ${minutosRestantes} minutos\n\nCopia e Cola PIX abaixo 👇` }
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
      body: {
        transaction_amount: 1,
        description: 'Programa Hormonal Dr. Vinicius',
        payment_method_id: 'pix',
        payer: { email: 'pagador@hormonioclinica.com' },
        metadata: { telefone }
      }
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
      body: {
        lead_telefone: telefone,
        payment_id: paymentId,
        metodo: 'pix',
        valor: 1,
        status: 'pending',
        pix_code: pixCode,
        qr_code_base64: qrBase64,
        expira_em: expiraEm,
        parcelas: 1,
        recorrente: false
      }
    });
  } catch(errSupabase) {
    // Erro não crítico — continua e envia PIX mesmo assim
    console.error('Supabase pagamentos 403 (não crítico):', String(errSupabase));
  }

  // Mensagem 1: confirmação de novo PIX
  await this.helpers.httpRequest({
    method: 'POST', url: ZAPI_URL,
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
    body: { phone: telefone, message: `🏦 Pagamento gerado!\n\n💰 Valor: R$ 1,00\n\nCopia e Cola PIX abaixo 👇` }
  });
}

// Mensagem 2: só o código PIX limpo (fácil de copiar)
await this.helpers.httpRequest({
  method: 'POST', url: ZAPI_URL,
  headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
  body: { phone: telefone, message: pixCode }
});

// Mensagem 3: instrução final
await this.helpers.httpRequest({
  method: 'POST', url: ZAPI_URL,
  headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
  body: { phone: telefone, message: `Após pagar, me avise aqui! 🎯` }
});

return [{ json: { pagamento_gerado: true, mensagem_enviada: true, telefone, payment_id: paymentId } }];
