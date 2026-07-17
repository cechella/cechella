const data = $input.item.json;
const { nome, dor, contextoOrigem, totalReferidos, faltam } = data;

const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtc2Jsc29xcWh0YW50eW9taHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTI5MDgsImV4cCI6MjA5NjQ2ODkwOH0.PAje_eA_dYrwM_5f-4n9MMDY-GGtC0ZzEdRn7W3gg30';

let contatosNaoEnviados = [];
let contatosRefs = [];
let telBusca = data.telefone || '';
if (telBusca.length === 12 && telBusca.startsWith('55')) {
  telBusca = telBusca.slice(0, 4) + '9' + telBusca.slice(4);
}

try {
  const resp = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telBusca}&status=eq.aguardando&order=created_at.asc&limit=5&select=nome,telefone`,
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  const respData = Array.isArray(resp) ? resp : [];
  contatosNaoEnviados = respData.map(c => c.nome);
  contatosRefs = respData.map(c => c.telefone);
} catch(e) {}

const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text';
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS';

// Busca total real direto do banco (evita valor cacheado do Prep Comun)
let totalReferidosReal = Number(totalReferidos) || 0;
try {
  const countResp = await this.helpers.httpRequest({
    method: 'GET',
    url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telBusca}&select=id`,
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  if (Array.isArray(countResp) && countResp.length > totalReferidosReal) {
    totalReferidosReal = countResp.length;
  }
} catch(e) {}
const faltamReal = Math.max(0, 20 - totalReferidosReal);

// Bloco 1: 20 contatos recebidos e ainda há contatos aguardando envio
if (totalReferidosReal >= 20 && contatosNaoEnviados.length > 0) {

  // Verifica se é o primeiro bloco (nenhum contato enviado ainda)
  let nenhumEnviado = true;
  try {
    const checkEnviados = await this.helpers.httpRequest({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telBusca}&status=eq.mensagem_enviada&select=id&limit=1`,
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    nenhumEnviado = !Array.isArray(checkEnviados) || checkEnviados.length === 0;
  } catch(e) {}

  if (nenhumEnviado) {
    await this.helpers.httpRequest({
      method: 'POST',
      url: ZAPI_URL,
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
      body: JSON.stringify({
        phone: data.telefone,
        message: `${nome}, você é incrível! 🎉\nO sistema confirmou que recebi seus 20 contatos. ✅\n\nAgora preciso de um último favor seu 🙏\nPara que suas amigas saibam que vou entrar em contato, me ajuda a enviar uma mensagem para cada uma delas?\n\nVou te mandar as mensagens prontas, é só encaminhar! 😊\n\nMe avisa se tiver alguma negativa — se não, todas ok! 💜`
      })
    });
    await new Promise(r => setTimeout(r, 2000));
  }

  for (const contato of contatosNaoEnviados) {
    await this.helpers.httpRequest({
      method: 'POST',
      url: ZAPI_URL,
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
      body: JSON.stringify({
        phone: data.telefone,
        message: `Oi ${contato}! Tudo bem? 😊\nAcabei de fazer uma coisa incrível pela minha saúde e pensei em você! Uma consultora chamada Ana do Hormone Ecosystem vai te mandar uma mensagem agora — pode responder ela, vale muito a pena ouvir! 🌸`
      })
    });
    await new Promise(r => setTimeout(r, 1500));
  }

  await this.helpers.httpRequest({
    method: 'POST',
    url: ZAPI_URL,
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
    body: JSON.stringify({
      phone: data.telefone,
      message: `Conseguiu encaminhar essas? Me avisa que mando mais! 😊💜`
    })
  });

  // Marca contatos como enviados
  try {
    for (const telContato of contatosRefs) {
      await this.helpers.httpRequest({
        method: 'PATCH',
        url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telBusca}&telefone=eq.${telContato}`,
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

  return [{ json: { ...data, _mensagensEnviadas: true, claudeBody: null } }];
}

// Bloco 2: 20 contatos recebidos e todos já foram enviados
if (totalReferidosReal >= 20 && contatosNaoEnviados.length === 0) {
  await this.helpers.httpRequest({
    method: 'POST',
    url: ZAPI_URL,
    headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
    body: JSON.stringify({
      phone: data.telefone,
      message: `Você foi incrível! 🎉💜 Todas as mensagens já foram enviadas!`
    })
  });
  await new Promise(r => setTimeout(r, 1500));

  // Pede profissão/hobby dos primeiros sem cadastro
  let primeiroGrupo = '';
  try {
    const respPH = await this.helpers.httpRequest({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telBusca}&select=nome,profissao&order=id.asc`,
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    const todosPH = Array.isArray(respPH) ? respPH : [];
    const semProf = todosPH.filter(c => !c.profissao).slice(0, 5);
    if (semProf.length > 0) {
      primeiroGrupo = semProf.map(c => `*${c.nome}*\nProfissão: \nHobby: `).join('\n\n');
    }
  } catch(e) {}

  if (primeiroGrupo) {
    await this.helpers.httpRequest({
      method: 'POST',
      url: ZAPI_URL,
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
      body: JSON.stringify({
        phone: data.telefone,
        message: `Ótimo! 🌸 Agora me ajuda com uma coisinha rápida?\nMe manda a profissão e o hobby dessas pessoas — pode copiar, preencher e me mandar de volta! 😊\n\n${primeiroGrupo}\n\nFica à vontade para simplificar, ex: Profissão: enfermeira / Hobby: caminhada`
      })
    });
  }

  // Avança para etapa 8
  try {
    await this.helpers.httpRequest({
      method: 'PATCH',
      url: `${SUPABASE_URL}/rest/v1/leads?telefone=eq.${data.telefone}`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ etapa_agente: 8 })
    });
  } catch(e) {}

  return [{ json: { ...data, _mensagensEnviadas: true, claudeBody: null } }];
}

// Bloco 3: menos de 20 contatos — Claude gerencia a conversa
const systemPrompt = `Você é Ana, consultora do Hormone Ecosystem. Você está na ETAPA 7 — REFERIDOS.
CONTEXTO DO LEAD: ${contextoOrigem}

INFORMAÇÃO DO SISTEMA — CONTATOS RECEBIDOS ATÉ AGORA: ${totalReferidosReal}
FALTAM PARA COMPLETAR 20: ${faltamReal}

REGRAS CRÍTICAS:
- O WhatsApp permite no máximo 10 contatos por envio — NUNCA peça 20 de uma vez
- SEMPRE use o número do sistema (${totalReferidosReal}) — NUNCA confie só no que o lead diz
- Se ${totalReferidosReal} >= 20 → retorne proxima_etapa: 8
- Se ${totalReferidosReal} > 0 e < 20 → peça os ${faltamReal} restantes dizendo exatamente quantos faltam
- Se ${totalReferidosReal} === 0 → siga o roteiro abaixo

SEU SCRIPT (quando totalReferidos === 0):
A mensagem de boas-vindas e confirmação de pagamento JÁ foi enviada automaticamente pelo sistema. NÃO repita.
Aguarde o lead responder. Se o lead ainda não respondeu iPhone ou Android, envie apenas:
"👉 Você tem iPhone ou Android? 😊"

SE RESPONDER IPHONE:
"Perfeito! Siga esses passos no iPhone: 📱
1️⃣ Olha embaixo da caixa de texto — tem um botão com sinal de + no lado esquerdo. Clica nele.
2️⃣ Vai aparecer um menu. Clica em 'Contato'.
3️⃣ Seleciona até 10 mulheres que você quer indicar.
4️⃣ Clica em 'Avançar' no canto superior direito.
5️⃣ Clica em 'Enviar' e pronto! 🎉
Consegue fazer isso agora? Eu fico aqui te esperando 🥰"

SE RESPONDER ANDROID:
"Perfeito! Siga esses passos no Android: 📱
1️⃣ Olha embaixo da caixa de texto — tem um botão com clipe 📎 no lado esquerdo. Clica nele.
2️⃣ Clica em 'Contato'.
3️⃣ Seleciona até 10 mulheres marcando o círculo do lado de cada nome.
4️⃣ Clica em 'Enviar' e pronto! 🎉
Consegue fazer isso agora? Eu fico aqui te esperando 🥰"

APÓS RECEBER CONTATOS — quando o lead confirmar que encaminhou ou pedir mais mensagens:
O sistema já enviou as mensagens automaticamente. NÃO escreva nem repita as mensagens. Apenas confirme que recebeu e pergunte: "Conseguiu encaminhar essas? Me avisa que mando mais! 😊"

REGRA DE AVANÇO: só retorne proxima_etapa: 8 quando sistema mostrar total_referidos >= 20

RESPONDA APENAS EM JSON PURO, SEM NENHUM TEXTO FORA DO JSON:
{
  "resposta": "sua mensagem aqui",
  "proxima_etapa": 7,
  "nome_lead": "${nome}",
  "dor_principal": "${dor}",
  "temperatura": "morno",
  "observacao": ""
}`;

return [{
  json: {
    ...data,
    systemPrompt,
    claudeBody: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...(data.historico || []).filter(m => m && m.role && m.content).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: data.message || data.mensagem || '' }
      ]
    })
  }
}];
