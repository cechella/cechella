const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtc2Jsc29xcWh0YW50eW9taHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTI5MDgsImV4cCI6MjA5NjQ2ODkwOH0.PAje_eA_dYrwM_5f-4n9MMDY-GGtC0ZzEdRn7W3gg30';
const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text';
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS';

const extrairMsg = $('Extrair Mensagem').item.json;
const telefone = extrairMsg.telefone || '';

const webhookRaw = $('Webhook Evolution API').item.json;
const bodyRaw = webhookRaw?.body || {};

const vcardContacts = Array.isArray(bodyRaw.contactArray) && bodyRaw.contactArray.length > 0
  ? bodyRaw.contactArray
  : (bodyRaw.contact ? [bodyRaw.contact] : []);

// Se não tem contatos vcard reais, ignora — não parsear texto como contato
if (vcardContacts.length === 0) {
  return [{ json: { salvos: 0, status: 'nenhum_vcard', telefone } }];
}

let indicado_por_nome = '';
let totalAtual = 0;
try {
  const r = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/leads?telefone=eq.${telefone}&select=nome,total_referidos`,
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
  });
  const lead = Array.isArray(r) ? r[0] : r;
  indicado_por_nome = lead?.nome || '';
  totalAtual = lead?.total_referidos || 0;
} catch(e) {}

const referidos = [];

for (const c of vcardContacts) {
  const nome = c.displayName || null;
  const fone = c.phones?.[0] ? String(c.phones[0]).replace(/\D/g, '') : null;
  if (!nome && !fone) continue;
  referidos.push({
    indicado_por_telefone: telefone,
    indicado_por_nome,
    nome: nome || fone,
    telefone: fone,
    profissao: null,
    hobby: null,
    prioridade: 2,
    status: 'aguardando',
  });
}

if (referidos.length === 0) {
  return [{ json: { salvos: 0, status: 'nenhum_referido', telefone } }];
}

await this.helpers.httpRequest({
  method: 'POST',
  url: `${SUPABASE_URL}/rest/v1/contatos_referidos`,
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Prefer': 'return=minimal',
  },
  body: JSON.stringify(referidos),
});

const novoTotal = totalAtual + referidos.length;

try {
  await this.helpers.httpRequest({
    method: 'PATCH',
    url: `${SUPABASE_URL}/rest/v1/leads?telefone=eq.${telefone}`,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ total_referidos: novoTotal }),
  });
} catch(e) {}

if (novoTotal < 20) {
  const faltam = 20 - novoTotal;
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: ZAPI_URL,
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
      body: JSON.stringify({ phone: telefone, message: `Vi que você me mandou ${novoTotal} contatos até agora! 🎉 Faltam só mais ${faltam} para completar os 20. Consegue enviar mais ${faltam} agora? 🥰` })
    });
  } catch(e) {}
}

if (novoTotal >= 20) {
  try {
    await this.helpers.httpRequest({
      method: 'PATCH',
      url: `${SUPABASE_URL}/rest/v1/leads?telefone=eq.${telefone}`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ etapa_agente: 8 }),
    });
  } catch(e) {}

  const mensagemEtapa8 = `Maravilhoso! 🎉 Você é incrível!\nO sistema confirmou que recebi ${novoTotal} contatos seus. ✅\nAgora me ajuda com uma coisa rápida — alguma das mulheres que você indicou já te respondeu dizendo que não quer receber contato? 😊\nSe sim, me fala o nome que eu já retiro da lista.\nSe todas toparam, me fala 'todas ok' e a gente segue!`;

  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: ZAPI_URL,
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': ZAPI_TOKEN,
      },
      body: JSON.stringify({ phone: telefone, message: mensagemEtapa8 }),
    });
  } catch(e) {}
}

return [{ json: { salvos: referidos.length, total_acumulado: novoTotal, status: 'ok', telefone } }];
