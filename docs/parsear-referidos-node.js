const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtc2Jsc29xcWh0YW50eW9taHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTI5MDgsImV4cCI6MjA5NjQ2ODkwOH0.PAje_eA_dYrwM_5f-4n9MMDY-GGtC0ZzEdRn7W3gg30';
const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text';
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS';

function extrairFoneVcard(phones) {
  if (!Array.isArray(phones) || phones.length === 0) return null;
  const primeiro = phones[0];
  let raw = '';
  if (typeof primeiro === 'string') {
    raw = primeiro;
  } else if (typeof primeiro === 'object' && primeiro !== null) {
    raw = primeiro.phone || primeiro.number || primeiro.value || primeiro.waid || '';
  }
  const d = raw.replace(/\D/g, '');
  return d.length >= 8 ? d : null;
}

const extrairMsg = $('Extrair Mensagem').item.json;
const telefoneRaw = extrairMsg.telefone || '';
let telefone = telefoneRaw;
if (telefone.length === 12 && telefone.startsWith('55')) {
  telefone = telefone.slice(0, 4) + '9' + telefone.slice(4);
}
const mensagem = extrairMsg.message || '';

const webhookRaw = $('Webhook Evolution API').item.json;
const bodyRaw = webhookRaw?.body || {};

const vcardContacts = Array.isArray(bodyRaw.contactArray) && bodyRaw.contactArray.length > 0
  ? bodyRaw.contactArray
  : (bodyRaw.contact ? [bodyRaw.contact] : []);

if (vcardContacts.length === 0) {
  return [{ json: { salvos: 0, status: 'nenhum_vcard', telefone } }];
}

let indicado_por_nome = '';
let totalAtual = 0;
let etapaAtual = 1;
try {
  const r = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/leads?telefone=eq.${telefoneRaw}&select=nome,total_referidos,etapa_agente`,
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
  });
  const lead = Array.isArray(r) ? r[0] : r;
  indicado_por_nome = lead?.nome || '';
  totalAtual = lead?.total_referidos || 0;
  etapaAtual = lead?.etapa_agente || 1;
} catch(e) {}

const referidos = [];
let semFone = 0;

for (const c of vcardContacts) {
  const nome = c.displayName || null;
  const fone = extrairFoneVcard(c.phones);
  if (!fone) {
    if (nome) semFone++;
    continue;
  }
  referidos.push({
    indicado_por_telefone: telefone,
    indicado_por_nome,
    nome: nome || fone,
    telefone: fone,
    profissao: null,
    hobby: null,
    tipo_envio: 'cartao',
    prioridade: 2,
    status: 'aguardando',
  });
}

if (referidos.length === 0) {
  if (semFone > 0) {
    try {
      await this.helpers.httpRequest({
        method: 'POST',
        url: ZAPI_URL,
        headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
        body: JSON.stringify({ phone: telefone, message: `Ops! Recebi ${semFone} contato${semFone > 1 ? 's' : ''} mas sem número de telefone salvo. 😅\nPara eu conseguir contar, preciso que o número esteja salvo na agenda. Consegue editar o contato e adicionar o número? Depois é só reenviar! 🙏` })
      });
    } catch(e) {}
  }
  return [{ json: { salvos: 0, status: 'nenhum_referido', telefone, etapa_agente: totalAtual } }];
}

const existentes = await this.helpers.httpRequest({
  method: 'GET',
  url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telefone}&select=telefone`,
  headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
});
const fonesExistentes = new Set((Array.isArray(existentes) ? existentes : []).map(e => e.telefone));
const fonesLote = new Set();
const referidosNovos = referidos.filter(r => {
  if (fonesExistentes.has(r.telefone) || fonesLote.has(r.telefone)) return false;
  fonesLote.add(r.telefone);
  return true;
});

if (referidosNovos.length === 0) {
  return [{ json: { salvos: 0, status: 'todos_ja_existem', telefone } }];
}

try {
  await this.helpers.httpRequest({
    method: 'POST',
    url: `${SUPABASE_URL}/rest/v1/contatos_referidos?on_conflict=indicado_por_telefone,telefone`,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify(referidosNovos),
  });
} catch(e) {}

// Busca total real do banco após inserção
let novoTotal = totalAtual + referidosNovos.length;
try {
  const totalResp = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telefone}&select=telefone`,
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
  });
  if (Array.isArray(totalResp)) novoTotal = totalResp.length;
} catch(e) {}

try {
  await this.helpers.httpRequest({
    method: 'PATCH',
    url: `${SUPABASE_URL}/rest/v1/leads?telefone=eq.${telefoneRaw}`,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'resolution=ignore-duplicates,return=minimal',
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

if (novoTotal >= 20 && etapaAtual < 8) {
  let etapaAtualizada = false;
  try {
    const patchResp = await this.helpers.httpRequest({
      method: 'PATCH',
      url: `${SUPABASE_URL}/rest/v1/leads?telefone=eq.${telefoneRaw}&etapa_agente=lt.8`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ etapa_agente: 7 }),
    });
    etapaAtualizada = Array.isArray(patchResp) ? patchResp.length > 0 : !!patchResp;
  } catch(e) {}

  if (!etapaAtualizada) {
    return [{ json: { salvos: referidosNovos.length, total_acumulado: novoTotal, status: 'etapa8_ja_enviada', telefone } }];
  }

  // Buscar primeiros 5 contatos do banco
  let primeiros5 = [];
  try {
    const contatosResp = await this.helpers.httpRequest({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telefone}&select=nome,telefone&order=created_at.asc&limit=5`,
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
    });
    primeiros5 = Array.isArray(contatosResp) ? contatosResp : [];
  } catch(e) {}

  // MSG 1: Confirmação + pedido de favor (unificada)
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: ZAPI_URL,
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
      body: JSON.stringify({ phone: telefone, message: `Maravilhoso! 🎉 Você é incrível!\nO sistema confirmou que recebi ${novoTotal} contatos seus. ✅\n\nAgora preciso de um último favor seu 🙏\nPara que suas amigas saibam que vou entrar em contato, me ajuda a enviar uma mensagem para cada uma delas?\n\nMe avisa se tiver alguma negativa — se não, todas ok! 💜` }),
    });
  } catch(e) {}

  await new Promise(r => setTimeout(r, 1500));

  // MSG 2: Intro das 5 mensagens individuais
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: ZAPI_URL,
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
      body: JSON.stringify({ phone: telefone, message: `Agora vou te mandar 5 mensagens prontas — uma para cada contato. É só encaminhar direto para cada uma delas! 📱✨` }),
    });
  } catch(e) {}

  await new Promise(r => setTimeout(r, 1500));

  // MSG 3-7: Uma mensagem individual por contato (primeiros 5)
  for (const contato of primeiros5) {
    const nomeContato = (contato.nome || 'amiga').split(' ')[0];
    const msg = `*Oi ${nomeContato}! Tudo bem?* 😊\nAcabei de fazer uma coisa incrível pela minha saúde e pensei em você! Uma consultora chamada Ana do Hormone Ecosystem vai te mandar uma mensagem agora — pode responder ela, vale muito a pena ouvir! 🌸`;
    try {
      await this.helpers.httpRequest({
        method: 'POST',
        url: ZAPI_URL,
        headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
        body: JSON.stringify({ phone: telefone, message: msg }),
      });
    } catch(e) {}
    await new Promise(r => setTimeout(r, 1500));
  }

  // Marca primeiros 5 como enviados para Etapa 7 não repetir
  try {
    for (const contato of primeiros5) {
      if (!contato.telefone) continue;
      await this.helpers.httpRequest({
        method: 'PATCH',
        url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telefone}&telefone=eq.${contato.telefone}`,
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status: 'mensagem_enviada' })
      });
    }
  } catch(e) {}

  // MSG final: aguarda confirmação antes de enviar próximas 5
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: ZAPI_URL,
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
      body: JSON.stringify({ phone: telefone, message: `Conseguiu encaminhar as 5? Me avisa quando terminar que mando mais 5! 😊💜` }),
    });
  } catch(e) {}

  return [{ json: { salvos: referidosNovos.length, total_acumulado: novoTotal, status: 'ok', telefone } }];
}

return [{ json: { salvos: referidosNovos.length, total_acumulado: novoTotal, status: 'ok', telefone } }];
