const claudeResponse = $input.item.json;
const lead = $('Montar Prompt').item.json;
let resposta = '', proximaEtapa = parseInt(lead.etapa_agente) || 1, dorPrincipal = lead.dor_principal, nomeLead = lead.nome;
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
} catch (e) {
  const etapaAtual = parseInt(lead.etapa_agente) || 1;
  proximaEtapa = etapaAtual;
  let raw = claudeResponse.content?.[0]?.text || 'Desculpe, tive um problema. Pode repetir?';
  resposta = raw.replace(/\s*\{[\s\S]*\}\s*$/i, '').replace(/\\n/g, '\n').trim();
  if (!resposta) resposta = 'Desculpe, tive um problema. Pode repetir?';
}
const historico = lead.historico || [];
historico.push({ role: 'assistant', content: resposta, ts: new Date().toISOString() });
return [{ json: { ...lead, resposta, proximaEtapa, dorPrincipal, nomeLead, historico } }];
