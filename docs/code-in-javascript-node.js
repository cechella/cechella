const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtc2Jsc29xcWh0YW50eW9taHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTI5MDgsImV4cCI6MjA5NjQ2ODkwOH0.PAje_eA_dYrwM_5f-4n9MMDY-GGtC0ZzEdRn7W3gg30';

const leadOriginal = $('Processar Lead').item.json;
const processar = $('Processar Resposta').item.json;
const telefone = $('Extrair Mensagem').item.json.telefone;

const leadId = leadOriginal.id;
const etapaAtual = parseInt(leadOriginal.etapa_agente) || 1;
const proximaEtapaClaude = parseInt(processar.proximaEtapa) || etapaAtual;

// Se for vCard, não atualiza lead nem deixa Claude responder
const messageType = $('Extrair Mensagem').item.json.messageType || 'text';
if (messageType === 'contact') {
  return [{ json: { saved: true, etapaSalva: etapaAtual, etapaAnterior: etapaAtual, resposta: null } }];
}

// CAP ABSOLUTO: máximo +1 por mensagem, nunca regride, nunca passa de 8
// Etapa 6 = Aguardando Pagamento — só avança via webhook MP, NUNCA por mensagem
const etapaSalvar = (etapaAtual === 6)
  ? 6
  : (proximaEtapaClaude > etapaAtual ? Math.min(etapaAtual + 1, 8) : etapaAtual);

const body = {
  telefone: telefone,
  nome: processar.nomeLead || processar.nome || null,
  etapa_agente: etapaSalvar,
  dor_principal: processar.dorPrincipal || processar.dor_principal || null,
  historico: processar.historico || [],
  temperatura: processar.temperatura || 'morno',
  origem_agente: 'whatsapp'
};

try {
  if (leadOriginal.isNew) {
    await this.helpers.httpRequest({
      method: 'POST',
      url: `${SUPABASE_URL}/rest/v1/leads`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(body),
    });
  } else {
    await this.helpers.httpRequest({
      method: 'PATCH',
      url: `${SUPABASE_URL}/rest/v1/leads?id=eq.${leadId}`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(body),
    });
  }
} catch(e) {
  console.error('Erro ao salvar lead:', e.message);
}
return [{ json: { saved: true, etapaSalva: etapaSalvar, etapaAnterior: etapaAtual, resposta: processar.resposta } }];
