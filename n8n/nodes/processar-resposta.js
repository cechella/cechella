const claudeResponse = $input.item.json;
const lead = $('Montar Prompt').item.json;
let resposta = '', proximaEtapa = parseInt(lead.etapa_agente) || 1, dorPrincipal = lead.dor_principal, nomeLead = lead.nome, metodoPagamento = lead.metodo_pagamento || '';
try {
  let content = claudeResponse.content?.[0]?.text || '';
  content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON found');
  const parsed = JSON.parse(jsonMatch[0]);
  resposta = parsed.resposta || content;
  resposta = resposta.replace(/\\n/g, '\n').trim();
  const etapaAtual = parseInt(lead.etapa_agente) || 1;
  const etapaSugerida = parseInt(parsed.proxima_etapa) || etapaAtual;
  proximaEtapa = Math.min(Math.max(etapaSugerida, etapaAtual), etapaAtual + 1, 8);
  if (parsed.dor_principal) dorPrincipal = parsed.dor_principal;
  if (parsed.nome_lead) nomeLead = parsed.nome_lead;
  if (parsed.metodo_pagamento) metodoPagamento = parsed.metodo_pagamento;
} catch (e) {
  const etapaAtual = parseInt(lead.etapa_agente) || 1;
  proximaEtapa = etapaAtual;
  let raw = claudeResponse.content?.[0]?.text || 'Desculpe, tive um problema. Pode repetir?';
  resposta = raw.replace(/\s*\{[\s\S]*\}\s*$/i, '').replace(/\\n/g, '\n').trim();
  if (!resposta) resposta = 'Desculpe, tive um problema. Pode repetir?';
}
const historico = lead.historico || [];
historico.push({ role: 'assistant', content: resposta, ts: new Date().toISOString() });
if ((parseInt(lead.etapa_agente) || 1) === 8) {
  const msgLead = lead.message || lead.mensagem || '';
  const REGEX_BLOCO = /\d+\.\s+\*?([^*\n]+)\*?\s*\nProfissão:\s*([^\n]*)\nHobby:\s*([^\n]*)/gi;
  const blocos = msgLead.match(REGEX_BLOCO);
  if (blocos && blocos.length > 0) {
    const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtc2Jsc29xcWh0YW50eW9taHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTI5MDgsImV4cCI6MjA5NjQ2ODkwOH0.PAje_eA_dYrwM_5f-4n9MMDY-GGtC0ZzEdRn7W3gg30';
    let telBusca = lead.telefone || '';
    if (telBusca.length === 12 && telBusca.startsWith('55')) {
      telBusca = telBusca.slice(0, 4) + '9' + telBusca.slice(4);
    }
    for (const bloco of blocos) {
      const REGEX_ITEM = /\d+\.\s+\*?([^*\n]+)\*?\s*\nProfissão:\s*([^\n]*)\nHobby:\s*([^\n]*)/i;
      const m = bloco.match(REGEX_ITEM);
      if (!m) continue;
      const nome = m[1].trim();
      const profissao = m[2].trim();
      const hobby = m[3].trim();
      if (!nome || (!profissao && !hobby)) continue;
      try {
        await this.helpers.httpRequest({
          method: 'PATCH',
          url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telBusca}&nome=eq.${encodeURIComponent(nome)}`,
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ profissao, hobby }),
        });
      } catch(e) {}
    }
  }
}
if (metodoPagamento && lead.telefone) {
  const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtc2Jsc29xcWh0YW50eW9taHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTI5MDgsImV4cCI6MjA5NjQ2ODkwOH0.PAje_eA_dYrwM_5f-4n9MMDY-GGtC0ZzEdRn7W3gg30';
  try {
    await this.helpers.httpRequest({
      method: 'PATCH',
      url: `${SUPABASE_URL}/rest/v1/leads?telefone=eq.${lead.telefone}`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ metodo_pagamento: metodoPagamento }),
    });
  } catch(e) {}
}
return [{ json: { ...lead, resposta, proximaEtapa, dorPrincipal, nomeLead, metodoPagamento, historico } }];
