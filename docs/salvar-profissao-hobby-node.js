// ═══════════════════════════════════════════════════════════════
// NÓ: Salvar Profissão Hobby
// Etapa 8 — Ana recebe lista de referidos com profissão e hobby
// e salva em contatos_referidos para uso no admin e vendas futuras
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtc2Jsc29xcWh0YW50eW9taHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTI5MDgsImV4cCI6MjA5NjQ2ODkwOH0.PAje_eA_dYrwM_5f-4n9MMDY-GGtC0ZzEdRn7W3gg30';

const extrairMsg = $('Extrair Mensagem').item.json;
const telefone = extrairMsg.telefone || '';
const mensagem = extrairMsg.mensagem || '';

// Só processa se a mensagem tem dados de profissão/hobby
if (!mensagem.includes('Profissão:') && !mensagem.includes('Hobby:') && !mensagem.includes('Profissao:')) {
  return [{ json: { salvos: 0, status: 'nenhum_dado' } }];
}

// Divide a mensagem em blocos por referido (separados por linha em branco ou numeração)
// Formato esperado:
// 1. Nome: Maria Silva
//    Profissão: Enfermeira
//    Hobby: Yoga
//
// 2. Nome: Ana Paula
//    Profissão: Professora
//    Hobby: Caminhada

const blocos = mensagem.split(/\n\s*\n|\n(?=\d+[\.\)])/);
const atualizacoes = [];

for (const bloco of blocos) {
  const nomeMatch = bloco.match(/Nome[:\s]+(.+)/i);
  const profissaoMatch = bloco.match(/Profiss[aã]o[:\s]+(.+)/i);
  const hobbyMatch = bloco.match(/Hobby[:\s]+(.+)/i);

  if (!nomeMatch && !profissaoMatch && !hobbyMatch) continue;

  const nome = nomeMatch?.[1]?.trim();
  const profissao = profissaoMatch?.[1]?.trim() || null;
  const hobby = hobbyMatch?.[1]?.trim() || null;

  if (!nome || (!profissao && !hobby)) continue;

  atualizacoes.push({ nome, profissao, hobby });
}

if (atualizacoes.length === 0) {
  return [{ json: { salvos: 0, status: 'nenhum_dado_parseado' } }];
}

// Busca os contatos_referidos indicados por este telefone
const referidos = await this.helpers.httpRequest({
  method: 'GET',
  url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telefone}&select=id,nome`,
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
  },
});

let salvos = 0;

for (const upd of atualizacoes) {
  // Encontra o referido pelo nome (busca parcial case-insensitive)
  const referido = referidos.find(r =>
    r.nome && upd.nome &&
    r.nome.toLowerCase().includes(upd.nome.toLowerCase().split(' ')[0])
  );

  if (!referido) continue;

  const patch = {};
  if (upd.profissao) patch.profissao = upd.profissao;
  if (upd.hobby) patch.hobby = upd.hobby;

  if (Object.keys(patch).length === 0) continue;

  try {
    await this.helpers.httpRequest({
      method: 'PATCH',
      url: `${SUPABASE_URL}/rest/v1/contatos_referidos?id=eq.${referido.id}`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(patch),
    });
    salvos++;
  } catch(e) {}
}

return [{ json: { salvos, total_blocos: atualizacoes.length, status: 'ok', telefone } }];
