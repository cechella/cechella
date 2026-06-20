// ═══════════════════════════════════════════════════════════════
// NÓ: Parsear Referidos (substituir o código atual por este)
// Usa Claude Haiku para extrair referidos em QUALQUER formato
// ═══════════════════════════════════════════════════════════════

const lead = $input.item.json;
const historico = lead.historico || [];
const indicado_por_telefone = lead.telefone || '';
const indicado_por_nome = lead.nome || '';

// ── 1. Coletar todas as mensagens do usuário após a etapa 6 ──
// Pega as últimas mensagens do lead (onde ele mandou os contatos)
const mensagens_usuario = historico
  .filter(m => m.role === 'user')
  .map(m => m.content)
  .join('\n---\n');

if (!mensagens_usuario || mensagens_usuario.length < 10) {
  return [{ json: { referidos: [], total: 0, indicado_por_nome, indicado_por_telefone } }];
}

// ── 2. Chamar Claude para extrair referidos em qualquer formato ──
const prompt = `Analise as mensagens abaixo enviadas por uma pessoa no WhatsApp e extraia todos os contatos que ela indicou.

As mensagens podem conter contatos em QUALQUER formato:
- "Maria Silva - médica - yoga - (48) 99999-1111"
- "Adão advogado gosta de cavalos"
- "Eva faxineira academia 48988887777"
- "1. João, professor, futebol"
- "Ana: dentista, pilates, 11 98888-5555"
- Qualquer combinação de nome, profissão, hobby e telefone

Para cada contato encontrado, extraia:
- nome: nome da pessoa (obrigatório)
- telefone: número de telefone com DDD (pode ser null se não informado)
- profissao: profissão ou ocupação (pode ser null)
- hobby: hobby, atividade ou interesse (pode ser null)

Retorne APENAS um JSON array válido, sem explicação, sem markdown, sem código, somente o array:
[{"nome":"...","telefone":"...","profissao":"...","hobby":"..."}]

Se não encontrar nenhum contato, retorne: []

MENSAGENS:
${mensagens_usuario}`;

let referidosExtraidos = [];

try {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': $env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  const data = await response.json();
  const texto = data?.content?.[0]?.text?.trim() || '[]';

  // Extrai o JSON mesmo se vier com texto extra
  const match = texto.match(/\[[\s\S]*\]/);
  if (match) {
    referidosExtraidos = JSON.parse(match[0]);
  }
} catch (e) {
  // Se Claude falhar, retorna vazio mas não quebra o workflow
  referidosExtraidos = [];
}

// ── 3. Limpar e formatar os dados ──
const referidosFormatados = referidosExtraidos
  .filter(r => r.nome && r.nome.trim().length > 1)
  .map(r => {
    // Limpar telefone: remover tudo exceto números
    let tel = (r.telefone || '').replace(/\D/g, '');
    // Garantir DDD: se tiver 8-9 dígitos sem DDD, não adicionar
    if (tel.length === 11 || tel.length === 10) {
      // já tem DDD
    } else if (tel.length < 8) {
      tel = null; // número inválido
    }

    // Determinar prioridade:
    // 1 = Alta (tem profissão + hobby)
    // 2 = Normal (só nome + telefone)
    const temProfissao = r.profissao && r.profissao.trim().length > 1;
    const temHobby = r.hobby && r.hobby.trim().length > 1;
    const prioridade = (temProfissao || temHobby) ? 1 : 2;

    return {
      indicado_por_telefone,
      indicado_por_nome,
      nome: r.nome.trim(),
      telefone: tel || null,
      profissao: r.profissao?.trim() || null,
      hobby: r.hobby?.trim() || null,
      prioridade,
      status: 'aguardando',
    };
  });

return [{
  json: {
    referidos: referidosFormatados,
    total: referidosFormatados.length,
    indicado_por_nome,
    indicado_por_telefone,
  }
}];
