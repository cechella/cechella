const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtc2Jsc29xcWh0YW50eW9taHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTI5MDgsImV4cCI6MjA5NjQ2ODkwOH0.PAje_eA_dYrwM_5f-4n9MMDY-GGtC0ZzEdRn7W3gg30';
const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text';
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS';
const MP_TOKEN = 'APP_USR-1603783113978504-062408-d67a1021538897e0341f70bb7645fdcf-2669863266';

const body = $input.item.json.body || $input.item.json;

const type = body.type || '';
const dataId = body.data?.id || body.id || '';

if (!dataId || (type !== 'payment' && type !== 'subscription_authorized_payment')) {
  return [{ json: { recebido: true, ignorado: true, motivo: 'não é pagamento' } }];
}

// ASSINATURA RECORRENTE
if (type === 'subscription_authorized_payment') {
  let autorizado;
  try {
    autorizado = await this.helpers.httpRequest({
      method: 'GET',
      url: `https://api.mercadopago.com/authorized_payments/${dataId}`,
      headers: { 'Authorization': `Bearer ${MP_TOKEN}` }
    });
  } catch(err) {
    return [{ json: { erro: 'Falha ao buscar autorized_payment', detalhe: err.message } }];
  }
  if (autorizado.status !== 'approved') {
    return [{ json: { ignorado: true, motivo: 'parcela não aprovada', status: autorizado.status } }];
  }
  const preapprovalId = String(autorizado.preapproval_id || '');
  const valor = autorizado.transaction_amount;
  const recorrentes = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/pagamentos_recorrentes?preapproval_id=eq.${preapprovalId}&select=id,parcelas_pagas,parcelas_total,lead_telefone`,
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const rec = recorrentes?.[0];
  if (rec) {
    const novasParcelas = (rec.parcelas_pagas || 0) + 1;
    const novoStatus = novasParcelas >= rec.parcelas_total ? 'concluido' : 'ativo';
    await this.helpers.httpRequest({
      method: 'PATCH',
      url: `${SUPABASE_URL}/rest/v1/pagamentos_recorrentes?id=eq.${rec.id}`,
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: { parcelas_pagas: novasParcelas, status: novoStatus }
    });
    const msg = `✅ *Parcela ${novasParcelas}/${rec.parcelas_total} confirmada!*\n\nCobrança de R$ ${valor} processada com sucesso. 💜`;
    await this.helpers.httpRequest({
      method: 'POST',
      url: ZAPI_URL,
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
      body: { phone: rec.lead_telefone, message: msg }
    });
  }
  return [{ json: { sucesso: true, preapprovalId } }];
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
const telefone = pagamento.metadata?.telefone || pagamento.external_reference || '';

if (status !== 'approved') {
  return [{ json: { recebido: true, ignorado: true, status, motivo: 'pagamento não aprovado' } }];
}

if (!telefone) {
  return [{ json: { recebido: true, ignorado: true, motivo: 'telefone não encontrado nos metadados' } }];
}

// Atualizar status no Supabase
await this.helpers.httpRequest({
  method: 'PATCH',
  url: `${SUPABASE_URL}/rest/v1/pagamentos?payment_id=eq.${paymentId}`,
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  },
  body: { status: 'approved', updated_at: new Date().toISOString(), valor: pagamento.transaction_amount }
});

// Buscar lead pelo telefone
const leads = await this.helpers.httpRequest({
  method: 'GET',
  url: `${SUPABASE_URL}/rest/v1/leads?telefone=eq.${telefone}&select=id,nome`,
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
    body: { etapa_agente: 7, status_pagamento: 'pago' }
  });
}

// Enviar confirmação de pagamento + abertura da Etapa 7 (iPhone/Android) em uma mensagem
const nomeLead = leads?.[0]?.nome || 'você';

const mensagem = `✅ ${nomeLead}, seu pagamento foi confirmado! 🎉💜 Seja bem-vinda ao Hormone Ecosystem!\nNossa equipe vai entrar em contato em breve para agendar seu procedimento.\n\nEnquanto isso, posso te pedir um favor? 🌸\nVocê acabou de tomar uma das melhores decisões da sua saúde. Tenho certeza que você conhece outras mulheres passando pelo mesmo que você passou.\nVou te ensinar agora como me mandar os contatos direto pelo WhatsApp. É super fácil! 😊\n\n👉 Você tem iPhone ou Android?`;

await this.helpers.httpRequest({
  method: 'POST',
  url: ZAPI_URL,
  headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
  body: { phone: telefone, message: mensagem }
});

// Salvar mensagem no historico do lead
if (leadId) {
  const leadAtual = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}&select=historico`,
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  const historicoAtual = leadAtual?.[0]?.historico || [];
  historicoAtual.push({ role: 'assistant', content: mensagem, ts: new Date().toISOString() });
  await this.helpers.httpRequest({
    method: 'PATCH',
    url: `${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: { historico: historicoAtual }
  });
}

return [{ json: { sucesso: true, telefone, paymentId, status: 'approved' } }];
