// ═══════════════════════════════════════════════════════════════
// NÓ: Parsear Referidos — Parser puro JS, sem API externa
// Extrai contatos em QUALQUER formato enviado pelo lead
// ═══════════════════════════════════════════════════════════════

const lead = $input.item.json;
const indicado_por_telefone = lead.telefone || '';
const indicado_por_nome = lead.nome || '';

// Pega o historico — pode vir como array ou string JSON
let historico = lead.historico || [];
if (typeof historico === 'string') {
  try { historico = JSON.parse(historico); } catch(e) { historico = []; }
}

// Pega TODAS as mensagens do usuário
const mensagensUsuario = historico
  .filter(m => m && m.role === 'user' && m.content && m.content.length > 2)
  .map(m => m.content);

if (mensagensUsuario.length === 0) {
  return [{ json: { referidos: [], total: 0, indicado_por_nome, indicado_por_telefone } }];
}

// Junta tudo em um bloco de texto para processar
const textoCompleto = mensagensUsuario.join('\n');

// Extrai todas as linhas com potencial de ser um contato
const linhas = textoCompleto
  .split('\n')
  .map(l => l.replace(/^\d+[\.\)\-\s]+/, '').trim()) // remove "1. " "2) " etc
  .filter(l => l.length >= 4);

const referidos = [];
const nomesVistos = new Set();

for (const linha of linhas) {

  // Ignora linhas que são claramente conversas (frases longas com verbo)
  if (linha.length > 120) continue;
  if (/\b(eu|meu|minha|você|pode|quero|tenho|está|vou|obrigad|sim|não|oi|olá|tudo|certo|ok|claro)\b/i.test(linha) && linha.length > 40) continue;

  // Extrai telefone se houver
  const telMatch = linha.match(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[\s\-]?\d{4}/);
  let telefone = null;
  if (telMatch) {
    const digitos = telMatch[0].replace(/\D/g, '');
    if (digitos.length >= 10 && digitos.length <= 13) {
      telefone = digitos;
    }
  }

  // Remove o telefone da linha para extrair nome/profissao/hobby
  const semTelefone = linha.replace(/(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[\s\-]?\d{4}/, '').trim();

  // Divide por separadores comuns
  const partes = semTelefone
    .split(/\s*[\-–,;:\/|]\s*/)
    .map(p => p.trim())
    .filter(p => p.length >= 2);

  if (partes.length === 0) continue;

  const nome = partes[0];

  // Nome precisa ter pelo menos 2 palavras OU ser claramente um nome
  const palavrasNome = nome.split(' ').filter(p => p.length > 1);
  if (palavrasNome.length < 2 && !telefone) continue;
  if (nome.length < 3) continue;

  // Evita duplicatas
  const nomeKey = nome.toLowerCase().replace(/\s+/g, '');
  if (nomesVistos.has(nomeKey)) continue;
  nomesVistos.add(nomeKey);

  const profissao = partes[1] || null;
  const hobby = partes[2] || null;

  referidos.push({
    indicado_por_telefone,
    indicado_por_nome,
    nome,
    telefone,
    profissao,
    hobby,
    prioridade: (profissao || hobby) ? 1 : 2,
    status: 'aguardando',
  });
}

return [{
  json: {
    referidos,
    total: referidos.length,
    indicado_por_nome,
    indicado_por_telefone,
  }
}];
