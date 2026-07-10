// ═══════════════════════════════════════════════════════════════
// NÓ: Montar Formulário Referidos
// Etapa 8 — Gera mensagem pedindo profissão/hobby APENAS dos
// referidos que ainda não têm esses dados no banco.
// Substitui o template fixo do Claude por mensagem dinâmica.
//
// POSIÇÃO NO FLUXO:
//   [Parsear Referidos] → [Montar Formulário Referidos]
//   (executado quando novoTotal >= 20, antes de pedir os dados)
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtc2Jsc29xcWh0YW50eW9taHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTI5MDgsImV4cCI6MjA5NjQ2ODkwOH0.PAje_eA_dYrwM_5f-4n9MMDY-GGtC0ZzEdRn7W3gg30';
const ZAPI_INSTANCE = '3DF0F4E14ADF3A9EF27059B99E2ECE64';
const ZAPI_TOKEN    = 'F16a4d3e95c034a14b42b138d8165a90cS';
const ZAPI_URL      = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`;

const telefone = $input.item.json.telefone || '';

if (!telefone) {
  return [{ json: { enviado: false, status: 'sem_telefone' } }];
}

// Buscar todos os referidos deste lead
const referidos = await this.helpers.httpRequest({
  method: 'GET',
  url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telefone}&select=id,nome,profissao,hobby&order=id.asc`,
  headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
});

if (!referidos || referidos.length === 0) {
  return [{ json: { enviado: false, status: 'sem_referidos' } }];
}

// Filtrar só os que ainda faltam profissão OU hobby
const faltando = referidos.filter(r => !r.profissao || !r.hobby);

if (faltando.length === 0) {
  // Todos já têm dados — não precisa perguntar nada
  return [{ json: { enviado: false, status: 'todos_completos', total: referidos.length } }];
}

// Montar lista numerada só com quem falta
let lista = '';
faltando.forEach((r, i) => {
  const nome = (r.nome || 'Contato').split(' ').slice(0, 3).join(' ');
  const profissaoLinha = r.profissao ? `Profissão: ${r.profissao}` : `Profissão: `;
  const hobbyLinha = r.hobby ? `Hobby: ${r.hobby}` : `Hobby: `;
  lista += `\n${i + 1}. *${nome}*\n${profissaoLinha}\n${hobbyLinha}\n`;
});

const jaCompletos = referidos.length - faltando.length;
const intro = jaCompletos > 0
  ? `Maravilhoso! 🎉 Você é incrível!\n\nJá tenho os dados de ${jaCompletos} contato${jaCompletos > 1 ? 's' : ''}. Só me falta completar mais ${faltando.length}:`
  : `Maravilhoso! 🎉 Você é incrível!\n\nAgora me ajuda com uma coisinha que vai fazer TODA a diferença? 🌸\n\nSó completar os espaços abaixo com a profissão e hobby de cada uma:`;

const mensagem = `${intro}\n${lista}\nPode copiar, completar e me mandar de volta! 😊\nIsso me ajuda a personalizar a abordagem para cada uma. 💜`;

await this.helpers.httpRequest({
  method: 'POST',
  url: ZAPI_URL,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ phone: `55${telefone.replace(/\D/g, '')}`, message: mensagem }),
});

return [{
  json: {
    enviado: true,
    faltando: faltando.length,
    ja_completos: jaCompletos,
    total: referidos.length,
    status: 'ok',
    telefone,
  }
}];
