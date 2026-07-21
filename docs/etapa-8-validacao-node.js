const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtc2Jsc29xcWh0YW50eW9taHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTI5MDgsImV4cCI6MjA5NjQ2ODkwOH0.PAje_eA_dYrwM_5f-4n9MMDY-GGtC0ZzEdRn7W3gg30';

const data = $input.item.json;
const { nome, dor, contextoOrigem, totalReferidos, telefone } = data;

let listaGrupos = [];
let jaPreenchidos = 0;
let faltamPreenchidos = 0;

if (telefone) {
  try {
    let telefone13 = telefone;
    if (telefone13.length === 12 && telefone13.startsWith('55')) {
      telefone13 = telefone13.slice(0, 4) + '9' + telefone13.slice(4);
    }

    const msgAtual = (data.message || data.mensagem || '');
    if (msgAtual.includes('Profiss') || msgAtual.includes('Hobby')) {
      const blocos = msgAtual.split(/\n\s*\n/);

      let todosRef = [];
      try {
        todosRef = await this.helpers.httpRequest({
          method: 'GET',
          url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telefone13}&select=id,nome,profissao&order=id.asc`,
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
        });
        if (!Array.isArray(todosRef)) todosRef = [];
      } catch(e) {}

      const jaUsados = new Set();

      const encontrarMelhor = (nomeForm) => {
        const nomeClean = nomeForm.toLowerCase().replace(/\*/g, '').trim();
        const palavras = nomeClean.split(/\s+/).filter(p => p.length > 1);

        // Nomes muito curtos: usa match exato
        if (palavras.length === 0) {
          return todosRef.find(r => !jaUsados.has(r.id) && !r.profissao && r.nome && r.nome.toLowerCase() === nomeClean) || null;
        }

        for (let n = palavras.length; n >= 1; n--) {
          const trecho = palavras.slice(0, n).join(' ');
          const match = todosRef.find(r => !jaUsados.has(r.id) && !r.profissao && r.nome && r.nome.toLowerCase().includes(trecho));
          if (match) return match;
        }
        return null;
      };

      for (const bloco of blocos) {
        const linhas = bloco.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let nomeBloco = null, profissaoBloco = null, hobbyBloco = null;
        for (const linha of linhas) {
          if (/Nome\s*:/i.test(linha)) {
            nomeBloco = linha.replace(/.*Nome\s*:\s*/i, '').trim();
          } else if (/^\*(.+)\*\s*$/.test(linha)) {
            nomeBloco = linha.replace(/\*/g, '').trim();
          } else if (/^[A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ]/.test(linha) && !(/Profiss|Hobby/i.test(linha))) {
            if (!nomeBloco) nomeBloco = linha.trim();
          } else if (/Profiss[aã]o\s*:/i.test(linha)) {
            profissaoBloco = linha.replace(/.*Profiss[aã]o\s*:\s*/i, '').trim();
          } else if (/Hobby\s*:/i.test(linha)) {
            hobbyBloco = linha.replace(/.*Hobby\s*:\s*/i, '').trim();
          }
        }
        if (nomeBloco && (profissaoBloco || hobbyBloco)) {
          try {
            const encontrado = encontrarMelhor(nomeBloco);
            if (encontrado) {
              jaUsados.add(encontrado.id);
              const patch = {};
              if (profissaoBloco) patch.profissao = profissaoBloco;
              if (hobbyBloco) patch.hobby = hobbyBloco;
              await this.helpers.httpRequest({
                method: 'PATCH',
                url: `${SUPABASE_URL}/rest/v1/contatos_referidos?id=eq.${encontrado.id}`,
                headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Prefer': 'return=minimal' },
                body: JSON.stringify(patch)
              });
            }
          } catch(e) {}
        }
      }
    }

    const resp = await this.helpers.httpRequest({
      method: 'GET',
      url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telefone13}&select=nome,profissao&order=id.asc`,
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
    });
    const contatos = Array.isArray(resp) ? resp : [];
    const semProfissao = contatos.filter(c => !c.profissao);
    jaPreenchidos = contatos.length - semProfissao.length;
    faltamPreenchidos = semProfissao.length;
    if (semProfissao.length > 0) {
      const proximoGrupo = semProfissao.slice(0, 5);
      listaGrupos.push(proximoGrupo.map(c => `*${c.nome}*\nProfissão: \nHobby: `).join('\n\n'));
    }
  } catch(e) {}
}

const todosColetados = listaGrupos.length === 0;

const ZAPI_URL = 'https://api.z-api.io/instances/3F4D4A5044DBE1E458808A5553EDB71F/token/039297EE5982433C7EFA38C5/send-text';
const ZAPI_TOKEN = 'F16a4d3e95c034a14b42b138d8165a90cS';

if (todosColetados) {
  // Todos os dados coletados — envia mensagem de encerramento diretamente via Z-API
  // SEM passar pelo Claude para evitar que o histórico confunda a resposta
  const mensagemFinal = `Você é demais! Fez tudo certinho! 🎉💜\nAgora é só aguardar o contato da nossa equipe para agendar seu procedimento. Será rápido, indolor e transformador! ✨\nEm breve você vai estar desfrutando de:\n✅ Sono profundo\n✅ Energia de verdade\n✅ Humor equilibrado\n✅ Libido restaurada\n✅ Aquele foco que você tinha antes\nObrigada por confiar no Hormone Ecosystem e em mim! Você vai se amar por essa decisão! 💜🌸`;
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: ZAPI_URL,
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
      body: JSON.stringify({ phone: telefone, message: mensagemFinal })
    });
  } catch(e) {}
  return [{ json: { ...data, _mensagensEnviadas: true, claudeBody: null, proximaEtapa: 9, resposta: mensagemFinal } }];
}

if (!todosColetados) {
  let introMsg;
  if (jaPreenchidos === 0) {
    introMsg = `Ótimo! 🌸 Agora me ajuda com uma coisinha rápida?\nMe manda a profissão e o hobby dessas pessoas — pode copiar, preencher e me mandar de volta! 😊`;
  } else if (jaPreenchidos <= 5) {
    introMsg = `Incrível! Já tenho os dados das primeiras ${jaPreenchidos}! 🎉 Faltam mais ${faltamPreenchidos} — me manda esse próximo grupo! 😊`;
  } else if (jaPreenchidos <= 10) {
    introMsg = `Metade feita! 🙌 Já temos ${jaPreenchidos} preenchidos, faltam mais ${faltamPreenchidos} — bora continuar com mais esse grupo! 😊`;
  } else {
    introMsg = `Quase lá! Faltam só mais ${faltamPreenchidos} e terminamos! 🏁 Me manda essas últimas! 😊`;
  }
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: ZAPI_URL,
      headers: { 'Content-Type': 'application/json', 'Client-Token': ZAPI_TOKEN },
      body: JSON.stringify({
        phone: telefone,
        message: `${introMsg}\n\n${listaGrupos[0]}`
      })
    });
  } catch(e) {}
  return [{ json: { ...data, _mensagensEnviadas: true, claudeBody: null } }];
}

const systemPrompt = todosColetados
? `Você é Ana, consultora do Hormone Ecosystem.
Todos os dados de profissão e hobby já foram coletados. Envie exatamente esta mensagem:

"Você é demais! Fez tudo certinho! 🎉💜
Agora é só aguardar o contato da nossa equipe para agendar seu procedimento. Será rápido, indolor e transformador! ✨
Em breve você vai estar desfrutando de:
✅ Sono profundo
✅ Energia de verdade
✅ Humor equilibrado
✅ Libido restaurada
✅ Aquele foco que você tinha antes
Obrigada por confiar no Hormone Ecosystem e em mim! Você vai se amar por essa decisão! 💜🌸"

RESPONDA EM JSON:
{
  "resposta": "Você é demais! Fez tudo certinho! 🎉💜\nAgora é só aguardar o contato da nossa equipe para agendar seu procedimento. Será rápido, indolor e transformador! ✨\nEm breve você vai estar desfrutando de:\n✅ Sono profundo\n✅ Energia de verdade\n✅ Humor equilibrado\n✅ Libido restaurada\n✅ Aquele foco que você tinha antes\nObrigada por confiar no Hormone Ecosystem e em mim! Você vai se amar por essa decisão! 💜🌸",
  "proxima_etapa": 9,
  "nome_lead": "${nome}",
  "dor_principal": "${dor}",
  "temperatura": "quente",
  "observacao": "coleta de profissao e hobby concluida"
}`
: `Você é Ana, consultora do Hormone Ecosystem. Etapa 8 — coleta de profissão e hobby.

REGRA GLOBAL — NUNCA comente sobre gênero, nome masculino/feminino ou perfil dos contatos. Aceite todos os contatos sem julgamento e siga o script.

INSTRUÇÃO OBRIGATÓRIA — IGNORAR HISTÓRICO:
O sistema já processou os dados recebidos. Sua ÚNICA tarefa agora é enviar o próximo grupo abaixo.
NÃO leia o histórico para decidir o que fazer. Siga apenas esta instrução.

Envie EXATAMENTE esta mensagem, sem alterar nada:
"Ótimo! 🌸 Agora me ajuda com uma coisinha rápida?
Me manda a profissão e o hobby dessas pessoas — pode copiar, preencher e me mandar de volta! 😊

${listaGrupos[0]}"

REGRAS ABSOLUTAS:
- Copie e envie o bloco acima EXATAMENTE como está
- PROIBIDO comentar sobre gênero, nome, ou perfil dos contatos
- PROIBIDO recusar ou filtrar contatos por qualquer motivo
- PROIBIDO agradecer, encerrar, ou gerar qualquer outra mensagem
- PROIBIDO pedir telefone, email ou qualquer outro dado
- PROIBIDO inventar nomes ou antecipar próximos grupos
- PROIBIDO fechar o atendimento — isso só acontece quando o sistema enviar proxima_etapa: 9

RESPONDA EM JSON:
{
  "resposta": "Ótimo! 🌸 Agora me ajuda com uma coisinha rápida?\nMe manda a profissão e o hobby dessas pessoas — pode copiar, preencher e me mandar de volta! 😊\n\n${listaGrupos[0]}",
  "proxima_etapa": 8,
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
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        ...(data.historico || []).filter(m => m && m.role && m.content).map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: data.message || data.mensagem || '' }
      ]
    })
  }
}];
