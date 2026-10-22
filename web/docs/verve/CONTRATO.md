# Contrato ATLAS ↔ VERVE (briefings) — 22/10/2026

**Papéis.** *Gustavo* (ATLAS) recebe o pedido do CEO no WhatsApp, escreve o briefing e o plano da semana e **propõe**. *VERVE* (Hormone) valida, mostra na aba **Briefings**, e **só depois da decisão do CEO** gera os rascunhos. Cada post ainda exige a autorização do CEO antes de o cron publicar.
**Dono:** o contrato é do ATLAS; o código do VERVE (rotas, aba, rascunhos, imagens) é da Hormone. Implementação de referência dos pontos críticos: `web/lib/verve/briefing-contract.ts` (+ testes). O ATLAS tem o espelho em Python e os dois lados reproduzem o mesmo hash.

## 1. Segurança (inegociável)
1. **O ATLAS nunca recebe a chave de serviço do Supabase** (`SUPABASE_SERVICE_ROLE_KEY` lê e grava tudo, inclusive dados de pacientes e a Ana). Ele usa um **token dedicado**, `VERVE_ATLAS_TOKEN` (aleatório, 32+ caracteres, criado pelo CEO nas variáveis da Vercel e num arquivo de segredos da VM do ATLAS). Validação em tempo constante: `atlasAuthorized` em `lib/verve/admin-core.ts`.
2. O token do ATLAS só vale em: `POST /briefings` (criar proposta), `GET /briefings?id=` (ler só o status) e `GET /metrics`. **Nunca** em `PATCH` (decisão), `posts`, `render`, `caption`, `upload` — essas exigem sessão de administrador (`requireAdmin`, PR #19).
3. Quem decide é só o **CEO, por sessão de administrador**. Decisão sem sessão = 401/403.

## 2. Fluxo e estados
`proposta` → (CEO) `aprovado` | `recusado`. Fim. Um briefing decidido não muda; para mudar, o Gustavo cria outro (outro conteúdo = outro hash).
Ao **aprovar**, a API do VERVE: grava `verve_semana` (uma linha por item do plano, status `planejado`), cria um rascunho em `verve_posts` por item (status `aguardando`, `briefing_id` preenchido), renderiza os slides em PNG e hospeda (`image_urls`). Falha num item = `verve_semana.status='erro'` + `erro`, sem desfazer a aprovação. **Autorizar um post** (`PATCH /posts` → `aprovado`) só é aceito com sessão de admin **e** `image_urls` não vazio; grava `approved_by` e `approved_at`.

## 3. Formato do briefing (conteúdo coberto pelo hash)
Sete campos, exatamente estes nomes (modelo: `docs/verve/briefing-exemplo.json`):
`titulo` (3–140) · `objetivo` (10–500) · `publico_alvo` (5–300) · `pilar` (`familia|autoridade|lifestyle`) · `indicadores` (1–12 de `{nome, meta|null, fonte}`; fonte ∈ `instagram_graph_api|manychat|verve_posts|manual`) · `gatilho_manychat` (`null` ou `{tipo:"manychat", palavra:/^[A-Z0-9]{3,30}$/, fluxo:"comentario>dm>whatsapp_business"}`) · `plano_semana` (1–14 itens).
Item do plano: `dia` (AAAA-MM-DD) · `hora` (HH:MM, fuso America/Sao_Paulo) · `tipo` (`carrossel|reel|story`) · `titulo` (≤120) · `pilar` · `slides` (carrossel: 3–10 de `{titulo ≤80, texto ≤280}`; demais: `null`/`[]`) · `legenda` (10–2200) · `cta` (`null` ou `{palavra, texto}`) · `revisao_necessaria` (**sempre `true`**).
Nada é preenchido por padrão: campo ausente = erro (422), nunca valor inventado. Meta numérica só se o CEO a definiu; senão `null` ("Não apurado").
**Publicidade médica:** todo texto do item passa por `complianceViolations` (`lib/verve/compliance.ts`). Qualquer violação = 422 e a aprovação fica bloqueada. O filtro só barra; a revisão médica e a autorização do CEO continuam obrigatórias.

## 4. Hash (aprovação presa à versão exata)
`conteudo_canonico` = JSON dos 7 campos com **chaves ordenadas recursivamente, sem espaços, UTF-8** (`canonicalize`; em Python `json.dumps(sort_keys=True, separators=(',',':'), ensure_ascii=False)`). `content_hash` = SHA-256 hexadecimal desse texto. O hash **não** cobre id, status, datas nem quem decidiu.
**Vetor de teste** (os dois lados precisam bater): `docs/verve/briefing-exemplo.json` → `briefing-exemplo.canonico.txt` → `briefing-exemplo.sha256` (`1506f0f9…db4db8`). O banco também confere (trigger `verve_briefings_check_hash`, `pgcrypto`).
Na decisão a API confere: `sha256(conteudo_canonico) == content_hash == hash enviado pela tela`, e que `conteudo_canonico` re-serializado é igual às colunas. Qualquer diferença = 409 `hash_diferente` e nada é aprovado.

## 5. API (todas em `/api/admin/verve`)
| Rota | Quem | O que faz |
|---|---|---|
| `POST /briefings` | token do ATLAS | Corpo `{briefing:{…7 campos…}, atlas_task_id?}` (≤ 64 KB). Valida (422 `{error:"briefing_invalido", erros:[…]}`), calcula canônico e hash, e grava `status='proposta'`, `criado_por='gustavo'` **definidos pelo servidor** (ignora o que vier no corpo). Colunas derivadas calculadas pela API: `semana` (ISO `AAAA-Www`, do primeiro item), `quantidade_posts`, `formato` (um tipo, ou `misto`). Mesmo hash já existente → 200 `{duplicado:true, id, status}`. Novo → 201 `{id, status:"proposta", content_hash, semana, quantidade_posts, banner:"Aguardando aprovação do CEO — nenhuma alteração aplicada"}`. |
| `GET /briefings?id=` | token do ATLAS ou admin | ATLAS recebe só `{id, status, content_hash, decidido_em, nota_decisao}`. |
| `GET /briefings` | admin | Lista com o conteúdo, para a aba. |
| `PATCH /briefings` | **só admin (sessão)** | `{id, hash, decisao:"aprovar"|"recusar", nota?}` → 409 se não estiver `proposta` ou o hash divergir; grava `decidido_por`/`decidido_em` e, se aprovar, gera `verve_semana` + rascunhos. |
| `GET /metrics` | token do ATLAS ou admin | Métricas reais do Instagram, com `updated_at` (o Gustavo cita número, fonte e data). |

## 6. Banco
`web/supabase/migrations/20261022_verve_briefings.sql` — **o CEO executa no SQL Editor do Supabase** (idempotente). Cria `verve_briefings` e `verve_semana`, colunas `briefing_id`, `approved_by`, `approved_at` em `verve_posts`, triggers (hash confere; conteúdo imutável; só `proposta → aprovado|recusado` com decisor; nada se apaga) e RLS sem acesso para `anon`/`authenticated`. Testado em PostgreSQL 16 (duas execuções seguidas, inserção válida, hash errado, duplicado, alteração de conteúdo, decisão repetida, exclusão).

## 7. Tarefas
**Hormone:** rotas acima (usar `requireAdmin`, `atlasAuthorized`, `validateBriefing`, `hashBriefing`); aba **Briefings** (lista, conteúdo, hash curto, avisos de publicidade médica, Aprovar/Recusar); a tela do VERVE passar a carregar os posts de `GET /posts` (hoje a semana está fixa no código); geração dos rascunhos e imagens; `PATCH /posts` exigindo imagens e gravando `approved_by`.
**ATLAS:** Gustavo entende "Projeto VERVE: …", escreve o briefing e o plano e valida com o espelho Python; `POST /briefings`; `GET /briefings?id=` para saber a decisão; `GET /metrics` e relatório semanal com número, fonte e data; cargo do VERVE no painel e na memória do Gustavo.
**CEO:** rodar o SQL; criar `VERVE_ATLAS_TOKEN` (Vercel e `/opt/atlas/secrets/verve-api.env` na VM); `ANTHROPIC_API_KEY` e `CRON_SECRET` na Vercel; decidir o cron (hoje a rota `publish` só aceita POST e o Vercel Cron chama GET).
