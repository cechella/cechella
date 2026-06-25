// ═══════════════════════════════════════════════════════════════
// NÓ: Salvar Profissão Hobby
// Etapa 8 — Ana recebe lista de referidos com profissão e hobby
// e salva em contatos_referidos para uso no admin e vendas futuras
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtc2Jsc29xcWh0YW50eW9taHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTI5MDgsImV4cCI6MjA5NjQ2ODkwOH0.PAje_eA_dYrwM_5f-4n9MMDY-GGtC0ZzEdRn7W3gg30';

const mensagem = $('Extrair Mensagem').item.json.message || '';
const telefone = $('Extrair Mensagem').item.json.telefone || '';

if (!mensagem.includes('Profiss') && !mensagem.includes('Hobby')) {
  return [{ json: { salvos: 0, status: 'nenhum_dado' } }];
}

const blocos = mensagem.split(/\n\s*\n/);
const atualizacoes = [];

for (const bloco of blocos) {
  const linhas = bloco.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let nome = null, profissao = null, hobby = null;

  for (const linha of linhas) {
    // Usa includes em vez de ^ para ignorar "1. " no início
    if (/Nome\s*:/i.test(linha)) {
      nome = linha.replace(/.*Nome\s*:\s*/i, '').trim();
    } else if (/Profiss[aã]o\s*:/i.test(linha)) {
      profissao = linha.replace(/.*Profiss[aã]o\s*:\s*/i, '').trim();
    } else if (/Hobby\s*:/i.test(linha)) {
      hobby = linha.replace(/.*Hobby\s*:\s*/i, '').trim();
    }
  }

  if (nome && (profissao || hobby)) {
    atualizacoes.push({ nome, profissao, hobby });
  }
}

if (atualizacoes.length === 0) {
  return [{ json: { salvos: 0, status: 'nenhum_dado_parseado' } }];
}

const referidos = await this.helpers.httpRequest({
  method: 'GET',
  url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telefone}&select=id,nome`,
  headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
});

let salvos = 0;

for (const upd of atualizacoes) {
  const primeiraPalavra = upd.nome.toLowerCase().split(' ')[0];
  const referido = referidos.find(r => r.nome && r.nome.toLowerCase().includes(primeiraPalavra));
  if (!referido) continue;

  const patch = {};
  if (upd.profissao) patch.profissao = upd.profissao;
  if (upd.hobby) patch.hobby = upd.hobby;

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

return [{ json: { salvos, total_parseados: atualizacoes.length, status: 'ok', telefone } }];
