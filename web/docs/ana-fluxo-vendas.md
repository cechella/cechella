# ANA — Fluxo de Vendas por Mensagem (n8n)

> **Arquivo de consulta e referência.** Não interfere nas funcionalidades do sistema.  
> Credenciais removidas intencionalmente — use variáveis de ambiente em produção.

---

## Visão Geral do Fluxo (n8n)

```
Prep Comun → Switch (mode: Rules)
              ├── Etapa 1 - Apresentação ──┐
              ├── Etapa 2 - Conexão        │
              ├── Etapa 3 - DI             ├──→ IF node ──true──→ 6A Memória → Processar Resposta
              ├── Etapa 4 - Speech         │              │         → Code JS → 6B Registro
              ├── Etapa 5 - Fechamento     │              │         → Humanizar Envio → Enviar WhatsApp
              ├── Etapa 6 - Aguardando Pg  │              false──→ [Nós de Conhecimento]
              ├── Etapa 7 - Referidos      │
              └── Etapa 8 - Validação ─────┘

Nós de Conhecimento (injetam contexto via IF false):
  Identidade → Científico + Compliance → Ana: Objeções + Fechamento
  → Ana: Debate Técnico → Ana: Conhecimento Global → É Não Definitivo → Agente Referidos 4
```

---

## Modelo de IA Utilizado

- **Modelo:** `claude-haiku-4-5-20251001`
- **Max tokens:** 1024
- **Saída:** JSON estruturado com campos: `resposta`, `proxima_etapa`, `nome_lead`, `dor_principal`, `temperatura`, `observacao`

---

## ETAPA 1 — Apresentação

**Objetivo:** Identificar nome do lead e sintoma principal.

**Lógica especial:**
- Consulta `contatos_referidos` pelo telefone para identificar se é lead referido
- Se referido: personaliza apresentação mencionando o indicador
- Se novo: apresentação genérica pedindo nome

**Script — lead referido:**
> "Oi [nome]! 😊 [indicador] me passou seu contato com muito carinho. ❤️  
> Meu nome é Ana, sou consultora do Dr. Vinícius Cechella aqui na Hormone Ecosystem..."

**Script — lead novo:**
> "Oi! 😊 Tudo bem? Meu nome é Ana, sou consultora do Dr. Vinícius Cechella...  
> Antes de começar, como posso te chamar? 😊"

**Regra de avanço:** nome + 1 sintoma → `proxima_etapa: 2`

**Sintomas mapeados:**
- Ondas de calor
- Dificuldade para dormir
- Mudanças de humor / ansiedade
- Cansaço sem motivo
- Queda na libido
- Dificuldade de concentração

---

## ETAPA 2 — Conexão

**Objetivo:** Criar rapport conectando profissão/rotina ao benefício do implante.

**Conexões por perfil:**
| Perfil | Benefício |
|--------|-----------|
| Pratica esporte | Disposição, recuperação muscular, energia |
| Agenda intensa | Foco, clareza mental, produtividade |
| Mãe com filhos | Paciência, humor estável, energia |
| Recém-separada | Nova fase, autoestima, disposição |
| Engordando sem razão | Metabolismo hormonal, equilíbrio |
| Insônia | Sono profundo, recuperação |

**Gatilho de avanço:** Lead responde "sim" à pergunta  
> "Você quer entender como funciona o implante e como ele pode resolver isso pra você?"

**Mensagem de transição (enviada ao receber sim):**
> "Que ótimo! 😊 Fico feliz que topou! 💜  
> [nome], sei que seu tempo é precioso. Vamos fazer um combinado? 🤝  
> No final desta apresentação, se você gostar do que vou te mostrar, você me diz um SIM..."

**Regra de avanço:** sim confirmado → `proxima_etapa: 3`

---

## ETAPA 3 — D.I. (Combinado)

**Objetivo:** Combinado + qualificação de decisão (marido/viagem).

**Fluxo:**

```
1. Enviar "combinado" (se ainda não enviado)
2. Receber confirmação do combinado
3. Perguntar: "Decisões de saúde toma sozinha ou alinha com marido?" + "Tem viagem marcada?"
4. Analisar resposta:
   - Precisa do marido → agendar ligação com os dois (permanece etapa 3)
   - Tem viagem → tranquilizar: procedimento 20min, sem repouso (permanece etapa 3)
   - Sozinha + sem viagem → avança para etapa 4 com speech completo
```

**Regra de avanço:** combinado + marido + viagem respondidos → `proxima_etapa: 4`

---

## ETAPA 4 — Speech (Apresentação do Produto)

**Objetivo:** Apresentar o implante e capturar reação do lead.

**Script principal:**
> "[nome], você me contou que está sentindo [dor]. Deixa eu te explicar...  
> O implante hormonal é um pequeno cilindro do tamanho de um grão de arroz 🌾 inserido sob a pele.  
> Libera hormônios de forma contínua, estável e natural..."

**Resultados apresentados:**
- ✅ Sono profundo de volta
- ✅ Energia e disposição
- ✅ Humor estável
- ✅ Libido restaurada
- ✅ Clareza mental
- ✅ Ondas de calor somem em 2–4 semanas
- ✅ Proteção cardiovascular e óssea
- Dura 6 meses — renovação automática

**Pergunta de transição:**
> "[nome], o que mais te chamou atenção do que eu acabei de te apresentar? 🌸"

**Após resposta do lead:** valida o que foi dito (1-2 frases) + apresenta preço → `proxima_etapa: 5`

---

## ETAPA 5 — Fechamento

**Objetivo:** Apresentar investimento e capturar forma de pagamento.

**Valores configuráveis via API `/api/admin/configuracoes`:**
- `valor_pix` (default: R$ 5.000)
- `valor_cartao` (default: R$ 5.000)
- `desconto_pix_pct` (default: 0%)
- `parcelas_max` (default: 6)
- `campanha.ativa` / `campanha.desconto_pct`

**Script:**
> "[nome], lembra do nosso combinado? 🤝  
> O investimento é de R$ [valor] — inclui procedimento completo, acompanhamento e 6 meses.  
> Coloca na conta: R$ [valor/6] por mês para acabar com [dor]..."
>
> 💳 Cartão — [Nx de R$ X (sem juros)]  
> 💰 Pix — R$ [valor] à vista

**Regra de avanço:** lead escolhe cartão ou pix → `proxima_etapa: 6` + `metodo_pagamento: "cartao"|"pix"`

---

## ETAPA 6 — Aguardando Pagamento

**Objetivo:** Manter o lead engajado enquanto aguarda confirmação do pagamento.

**Regras críticas:**
- Link/PIX já enviado AUTOMATICAMENTE pelo sistema — NUNCA mencionar "equipe"
- NUNCA avançar manualmente — sistema avança ao confirmar pagamento

**Respostas padrão:**
- Lead diz que pagou → "Estou verificando no sistema... normalmente leva poucos minutos 💜"
- Lead pergunta se recebeu → "Aguardando confirmação do banco. O PIX confirma em até 5 min 😊"
- Lead pede reenvio → "Vou reenviar agora 😊"
- Lead desiste → "Entendo! Sem pressão. Se mudar de ideia, estou aqui 🌸"

---

## ETAPA 7 — Referidos (20 contatos)

**Objetivo:** Coletar 20 contatos de WhatsApp da paciente que já pagou.

**Lógica:**
1. Detecta total de referidos em `contatos_referidos` via Supabase
2. Se `total < 20`: pergunta iPhone ou Android e guia o envio de contatos
3. Se `total >= 20` e há contatos com `status=aguardando`:
   - Envia mensagem de parabéns + instruções de encaminhamento
   - Marca todos como `mensagem_enviada`
4. Se `total >= 20` e todos enviados → transição para Etapa 8

**Instruções por dispositivo:**
- **iPhone:** botão `+` → Contato → seleciona → Avançar → Enviar
- **Android:** clipe 📎 → Contato → seleciona → Enviar

**Mensagem de encaminhamento para a paciente enviar às amigas:**
> "Oi! Tudo bem? 😊 Acabei de fazer uma coisa incrível pela minha saúde e pensei em você!  
> Uma consultora chamada Ana do Hormone Ecosystem vai te mandar uma mensagem agora..."

---

## ETAPA 8 — Validação (Profissão/Hobby dos Referidos)

**Objetivo:** Coletar profissão e hobby de cada referido para personalizar abordagem de Ana.

**Lógica:**
1. Busca referidos sem `profissao` preenchida
2. Envia lista formatada em grupos de 5:
   ```
   *[Nome]*
   Profissão: 
   Hobby: 
   ```
3. Processa resposta da paciente: faz match por nome e faz PATCH no Supabase
4. Repete até todos preenchidos
5. Mensagem final quando todos completos:
   > "Você é demais! Fez tudo certinho! 🎉💜  
   > Agora é só aguardar o contato da nossa equipe para agendar seu procedimento..."

---

## Nós de Conhecimento (Injeção Contextual)

Estes nós são ativados por gatilhos na mensagem do lead e injetam contexto adicional no `system` do Claude antes da chamada à API.

### Nó: Identidade
**Gatilhos:** "quem é você", "você é ia", "quem é o médico", "vinícius", "malavasi", etc.

**Conteúdo injetado:**
- Regras absolutas de comportamento (7 regras)
- Perfil Dr. Vinícius Cechella (médico responsável)
- Currículo completo Dr. André Malavasi (pesquisador do protocolo)
- Respostas padrão para perguntas sobre médicos

### Nó: Científico + Compliance
**Gatilhos:** "estudo", "evidência", "anvisa", "hormônio", "glade", "clara", "whi", etc.

**Conteúdo injetado:**
- Protocolo técnico (hormônios, duração, diferencial)
- Respaldo regulatório (CFM 2.217/2018, CFM 2.294/2021, ANVISA)
- Estudos principais: WHI, ELITE Trial, GLADE, CLARA, Safety Gestrinone
- Compliance: o que NUNCA dizer

### Nó: Debate Técnico
**Gatilhos:** "endocrinologista", "clinical trial", "p-value", "sbem", "doi", "pubmed", etc.

**Conteúdo injetado:**
- 6 estudos completos com metodologia, resultados e limitações
- WHI (JAMA 2002), ELITE Trial (NEJM 2016), CLARA Study (2025), GLADE Study (2025), E3N Cohort (2008), Consenso IMS/EMAS (2019)
- Defesa contra posicionamento SBEM 2021 e ANVISA RE 4.353/2024
- Tom para debate com especialistas

### Nó: Conhecimento Global
Mesmos gatilhos e conteúdo do Debate Técnico (nó espelho para cobertura em etapas diferentes).

### Nó: É Não Definitivo
**Gatilhos:** frases de recusa definitiva OU `ciclo_objecao >= 3`

**Lógica:**
- Detecta "não tenho interesse", "desisto", "para de insistir", etc.
- Insere flag em `leads_m4_flag` no Supabase
- Passa `_is_no: true` para o próximo nó

### Nó: Agente Referidos 4 (Pós-NÃO)
**Ativado por:** `_is_no: true` ou `sentinelAtivo` (flag em `leads_m4_flag`)

**Objetivo:** Coletar 4 referidos de quem disse não comprar.

**Fluxo:**
1. Primeiro NÃO: pede 4 contatos amigavelmente
2. Recebe vCards → salva em `contatos_referidos` com `fonte: "Via ANA - Referral Pos-NAO"`
3. Com 4 referidos: envia mensagem de encaminhamento + pede profissão/hobby
4. Processa profissão/hobby e finaliza com mensagem de encerramento

---

## Stack Técnica do Fluxo

| Componente | Tecnologia |
|------------|-----------|
| Orquestração | n8n (self-hosted) |
| LLM | Claude Haiku 4.5 via Anthropic API |
| Banco de dados | Supabase (PostgreSQL) |
| Envio de mensagens | Z-API (WhatsApp) |
| Recebimento | Evolution API (webhook) |

## Tabelas Supabase Utilizadas

| Tabela | Uso |
|--------|-----|
| `leads` | Dados do lead + etapa atual (`etapa_agente`) |
| `contatos_referidos` | Referidos coletados com profissão/hobby/status |
| `leads_m4_flag` | Flag de leads que disseram não definitivo |

---

*Última atualização: 2026-07-31*
