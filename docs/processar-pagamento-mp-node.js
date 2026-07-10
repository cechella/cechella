// ═══════════════════════════════════════════════════════════════
// NÓ: Processar Pagamento MP — My workflow
// Recebe webhook do Mercado Pago, valida pagamento aprovado,
// avança lead para etapa 7 (Referidos) e envia confirmação WhatsApp
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtc2Jsc29xcWh0YW50eW9taHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTI5MDgsImV4cCI6MjA5NjQ2ODkwOH0.PAje_eA_dYrwM_5f-4n9MMDY-GGtC0ZzEdRn7W3gg30';
const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text';
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS';
const MP_TOKEN = 'APP_USR-1603783113978504-062408-d67a1021538897e0341f70bb7645fdcf-2669863266';

const body = $input.item.json.body || $input.item.json;

// MP envia o tipo e id do recurso
const type = body.type || '';
const dataId = body.data?.id || body.id || '';

if (!dataId || type !== 'payment') {
  return [{ json: { recebido: true, ignorado: true, motivo: 'não é pagamento' } }];
}

// Buscar detalhes do pagamento no MP
let pagamento;
try {
  pagamento = await this.helpers.httpRequest({
    method: 'GET',
    url: `https://api.mercadopago.com/v1/payments/${dataId}`,
    headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
  });
} catch (err) {
  return [{ json: { erro: 'Falha ao buscar pagamento MP', detalhe: err.message } }];
}

const status = pagamento.status || '';
const paymentId = String(pagamento.id || '');
// PIX: telefone vem em metadata.telefone | Cartão: vem em external_reference
const telefone = pagamento.metadata?.telefone || pagamento.external_reference || '';

if (status !== 'approved') {
  return [{ json: { recebido: true, ignorado: true, status, motivo: 'pagamento não aprovado' } }];
}

if (!telefone) {
  return [{ json: { recebido: true, ignorado: true, motivo: 'telefone não encontrado nos metadados' } }];
}

// Atualizar status na tabela pagamentos
await this.helpers.httpRequest({
  method: 'PATCH',
  url: `${SUPABASE_URL}/rest/v1/pagamentos?payment_id=eq.${paymentId}`,
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: { status: 'approved', updated_at: new Date().toISOString() }
});

// Buscar id do lead pelo telefone (PATCH por id — evita falha silenciosa por formato)
const leads = await this.helpers.httpRequest({
  method: 'GET',
  url: `${SUPABASE_URL}/rest/v1/leads?telefone=eq.${telefone}&select=id`,
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`
  }
});

const leadId = leads?.[0]?.id;
if (leadId) {
  await this.helpers.httpRequest({
    method: 'PATCH',
    url: `${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: { etapa_agente: 7, metodo_pagamento: pagamento.metadata?.metodo || 'pix' }
  });
}

// Enviar mensagem de confirmação via WhatsApp
const mensagem = `✅ Pagamento confirmado!\n\nSeu acesso ao Programa Hormonal do Dr. Vinicius foi liberado! 🎉\n\nEm breve nossa equipe entrará em contato com os próximos passos.\n\nObrigado pela confiança! 💙`;

await this.helpers.httpRequest({
  method: 'POST',
  url: ZAPI_URL,
  headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
  body: { phone: telefone, message: mensagem }
});

return [{ json: { sucesso: true, telefone, paymentId, status: 'approved' } }];
