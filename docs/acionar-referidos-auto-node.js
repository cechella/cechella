// ═══════════════════════════════════════════════════════════════
// NÓ: Acionar Referidos Automaticamente
// Etapa 8 — Após salvar profissão/hobby, Ana envia WhatsApp
// para os top referidos em ordem de score (renda + dados)
//
// POSIÇÃO NO FLUXO:
//   [Salvar Profissão Hobby] → [Acionar Referidos Auto]
//
// CONDIÇÃO DE ENTRADA:
//   Apenas executa se salvos > 0 (ao menos 1 profissão/hobby foi salvo)
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtc2Jsc29xcWh0YW50eW9taHNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTI5MDgsImV4cCI6MjA5NjQ2ODkwOH0.PAje_eA_dYrwM_5f-4n9MMDY-GGtC0ZzEdRn7W3gg30';
const ZAPI_INSTANCE = '3DF0F4E14ADF3A9EF27059B99E2ECE64';
const ZAPI_TOKEN    = 'F16a4d3e95c034a14b42b138d8165a90cS';
const ZAPI_URL      = `https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}`;

// ── Scoring ──────────────────────────────────────────────────
function rendaScore(profissao) {
  if (!profissao) return 1;
  const p = profissao.toLowerCase();
  const alta = ['médic','medic','dentist','advogad','empresári','empresari',
                'diretor','ceo','cfo','gerente','consultor','arquitet',
                'veterinári','farmacêut','farmaceut','engenhei','jogador'];
  const media = ['professor','enfermei','fisio','nutricion','psicolog',
                 'contador','administr','tecnolog','analista','desenvolv','designer'];
  if (alta.some(k => p.includes(k))) return 5;
  if (media.some(k => p.includes(k))) return 3;
  return 2;
}

function calcScore(profissao, hobby) {
  const renda = rendaScore(profissao);
  const dados = (profissao && hobby) ? 3 : (profissao || hobby) ? 1 : 0;
  return renda + dados;
}

// ── Verificar se deve executar ────────────────────────────────
const prevResult = $input.item.json;
if (!prevResult || prevResult.salvos === 0) {
  return [{ json: { acionados: 0, status: 'nenhum_salvo' } }];
}

const telefoneIndicador = prevResult.telefone || '';
if (!telefoneIndicador) {
  return [{ json: { acionados: 0, status: 'sem_telefone_indicador' } }];
}

// ── Buscar referidos do lead ──────────────────────────────────
const referidos = await this.helpers.httpRequest({
  method: 'GET',
  url: `${SUPABASE_URL}/rest/v1/contatos_referidos?indicado_por_telefone=eq.${telefoneIndicador}&status=eq.aguardando&select=id,nome,telefone,profissao,hobby,status`,
  headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
});

if (!referidos || referidos.length === 0) {
  return [{ json: { acionados: 0, status: 'sem_referidos_aguardando' } }];
}

// ── Buscar nome do indicador ──────────────────────────────────
const leads = await this.helpers.httpRequest({
  method: 'GET',
  url: `${SUPABASE_URL}/rest/v1/leads?telefone=eq.${telefoneIndicador}&select=nome`,
  headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY },
});
const nomeIndicador = (leads && leads[0] && leads[0].nome) ? leads[0].nome.split(' ')[0] : 'um paciente';

// ── Ordenar por score (renda alta + dados ganha sempre) ───────
const rankingado = referidos
  .filter(r => r.telefone)
  .map(r => ({ ...r, score: calcScore(r.profissao, r.hobby) }))
  .sort((a, b) => b.score - a.score);

// ── Montar mensagem personalizada por perfil ──────────────────
function montarMensagem(ref, nomeInd) {
  const nome = (ref.nome || '').split(' ')[0] || 'Olá';

  // Personalização por profissão/hobby
  let contexto = '';
  if (ref.profissao) {
    const p = ref.profissao.toLowerCase();
    if (p.includes('médic') || p.includes('medic') || p.includes('dentist')) {
      contexto = `Como profissional da saúde, você certamente entende a importância do equilíbrio hormonal para uma vida de alta performance.`;
    } else if (p.includes('empresári') || p.includes('diretor') || p.includes('ceo')) {
      contexto = `Como empresária, seu nível de energia e foco impactam diretamente seus resultados.`;
    } else if (p.includes('professor') || p.includes('psicolog')) {
      contexto = `Com sua rotina exigente, o equilíbrio hormonal faz toda diferença no seu bem-estar e disposição.`;
    } else {
      contexto = `Sei que sua rotina é puxada e que você merece se sentir com energia e disposição todos os dias.`;
    }
  } else {
    contexto = `Sei que você é uma pessoa especial e que merece se sentir com energia e disposição todos os dias.`;
  }

  return `Oi ${nome}! 🌿

Sou a Ana, assistente da Clínica do Dr. Vinícius Cechella.

${nomeInd.split(' ')[0]} me passou seu contato com muito carinho. ❤️

${contexto}

O Dr. Vinícius é especialista em Medicina do Estilo de Vida e tem ajudado mulheres como você a recuperarem energia, libido, sono de qualidade e leveza — através de um protocolo personalizado de reposição hormonal.

Posso te contar mais sobre como funciona? São apenas alguns minutos e sem compromisso. 😊`;
}

// ── Enviar WhatsApp para cada referido (máx 10) ───────────────
let acionados = 0;
const erros = [];
const MAX = Math.min(rankingado.length, 10);

for (let i = 0; i < MAX; i++) {
  const ref = rankingado[i];
  const tel = ref.telefone.replace(/\D/g, '');
  if (tel.length < 10) continue;

  const mensagem = montarMensagem(ref, nomeIndicador);

  // Delay progressivo para não parecer spam (2s entre mensagens)
  if (i > 0) await new Promise(r => setTimeout(r, 2000));

  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: `${ZAPI_URL}/send-text`,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: `55${tel}`, message: mensagem }),
    });

    // Atualizar status para 'contatado' no Supabase
    await this.helpers.httpRequest({
      method: 'PATCH',
      url: `${SUPABASE_URL}/rest/v1/contatos_referidos?id=eq.${ref.id}`,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ status: 'contatado' }),
    });

    acionados++;
  } catch(e) {
    erros.push({ nome: ref.nome, erro: e.message });
  }
}

return [{
  json: {
    acionados,
    total_referidos: referidos.length,
    ranking_usado: rankingado.slice(0, MAX).map(r => ({
      nome: r.nome,
      score: r.score,
      profissao: r.profissao,
      hobby: r.hobby,
    })),
    erros,
    status: acionados > 0 ? 'ok' : 'falha',
    telefone_indicador: telefoneIndicador,
  }
}];
