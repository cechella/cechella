// ═══════════════════════════════════════════════════════════════
// NÓ: Salvar Referidos — substituir o HTTP Request atual por
// um nó CODE que salva todos os referidos de uma vez via upsert
// ═══════════════════════════════════════════════════════════════

const { referidos, total } = $input.item.json;

if (!referidos || referidos.length === 0) {
  return [{ json: { salvos: 0, mensagem: 'Nenhum referido para salvar' } }];
}

const SUPABASE_URL = $env.SUPABASE_URL;
const SUPABASE_KEY = $env.SUPABASE_ANON_KEY;

// Salvar todos de uma vez via upsert
const response = await fetch(`${SUPABASE_URL}/rest/v1/referidos`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Prefer': 'return=minimal',
  },
  body: JSON.stringify(referidos),
});

if (!response.ok) {
  const erro = await response.text();
  throw new Error(`Erro ao salvar referidos: ${response.status} — ${erro}`);
}

return [{ json: { salvos: referidos.length, status: 'ok' } }];
