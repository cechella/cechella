# N8N — Etapas WhatsApp Ana (Referência para VAPI Voz)

> Código fonte dos nós n8n da Ana Mensagem (WhatsApp).
> Usado como referência para montar o fluxo equivalente na Ana Voz (VAPI).

## Diferenças WhatsApp vs Voz

| WhatsApp (n8n) | Voz (VAPI) |
|---|---|
| JSON com `proxima_etapa` | Tools: `update_etapa`, `save_sintoma`, etc. |
| Emojis, listas, formatação | Máximo 2 frases, sem formatação |
| Referidos via vCard (20 contatos) | Referidos por voz (5 contatos) + WhatsApp |
| Nós condicionais para identidade | Contexto estático no system prompt |
| Marido/viagem = perguntas obrigatórias | Mesmas perguntas, adaptadas para voz |
| Combinado literal com emoji | Combinado natural sem emoji |

## Etapas Críticas que Faltavam no VAPI

### ETAPA 2 — Combinado (CRÍTICO)
Antes de avançar para o speech, Ana DEVE fazer o combinado:
> "Sei que seu tempo é precioso. Vamos fazer um combinado? No final desta explicação, se você gostar do que ouvir, você me diz um sim e a gente avança juntos. Se não gostar, tudo bem. Combinado?"
- Só avança para Etapa 3 se lead confirmar o combinado

### ETAPA 3 — DI + Perguntas Pré-Fechamento (CRÍTICO)
Após confirmado o combinado, ANTES do speech:
1. Pergunta sobre marido/decisão: "Decisões de saúde como essa você costuma tomar sozinha ou prefere alinhar com alguém primeiro?"
2. Pergunta sobre viagem: "Você tem alguma viagem marcada nos próximos dias?"

Lógica de avanço:
- Precisa do marido → agenda ligação com os dois
- Tem viagem → tranquiliza (procedimento 20min, pode viajar no mesmo dia)
- Toma sozinha + sem viagem → avança direto para Etapa 4 (Speech)

---

## Código Completo — Etapa 1
```javascript
const SUPABASE_URL = 'https://rmsblsoqqhtantyomhsh.supabase.co';
// [código completo preservado abaixo]
// Busca se lead é referido e personaliza apresentação
// Script A (referido): "Oi [nome]! [indicador] me passou seu contato..."
// Script B (orgânico): apresentação padrão
// Critério avanço: nome + 1 sintoma → proxima_etapa: 2
```

## Código Completo — Etapa 2 (Conexão + COMBINADO)
```javascript
// Conecta profissão/rotina a benefício do implante
// OBRIGATÓRIO ao final: "Você quer entender como funciona o implante?"
// Só após SIM do lead → envia o COMBINADO:
// "Sei que seu tempo é precioso. Vamos fazer um combinado? 🤝
//  No final desta apresentação, se você gostar do que vou te mostrar,
//  você me diz um SIM e a gente avança juntos. Se não gostar — tudo bem,
//  continuamos amigas. 😊 Combinado?"
// NUNCA avança sem confirmação do combinado
```

## Código Completo — Etapa 3 (DI — Marido + Viagem)
```javascript
// Fase 1: envia Combinado (se não foi enviado ainda)
// Fase 2: após confirmação, envia as 2 perguntas:
//   "1. Decisões de saúde como essa você costuma tomar sozinha ou
//      gosta de alinhar com seu marido primeiro?
//    2. Você tem alguma viagem marcada nos próximos dias?"
// Fase 3: processa respostas:
//   - Precisa do marido → agenda call a 3
//   - Tem viagem → "procedimento 20min, pode viajar no mesmo dia"
//   - Sozinha + sem viagem → proxima_etapa: 4 (Speech)
```

## Código Completo — Etapa 4 (Speech)
```javascript
// Script exato do grão de arroz + lista de resultados
// Após enviar script → pergunta: "O que mais te chamou atenção?"
// Após resposta → valida + apresenta preço → proxima_etapa: 5
```

## Código Completo — Etapa 5 (Fechamento)
```javascript
// Busca configs dinâmicas de pagamento via /api/admin/configuracoes
// valorPix, valorCartao, parcelasMax, campanhaAtiva
// Script: "Lembra do nosso combinado? Você disse que se gostasse..."
// PIX escolhido → metodo_pagamento: "pix" → proxima_etapa: 6
// Cartão escolhido → metodo_pagamento: "cartao" → proxima_etapa: 6
```

## Código Completo — Etapa 6 (Aguardando Pagamento)
```javascript
// NUNCA diz "vou passar para a equipe"
// Link JÁ enviado automaticamente pelo sistema
// Avança para etapa 7 APENAS via automação de pagamento confirmado
// Mantém lead engajado enquanto aguarda
```

## Código Completo — Etapa 7 (Referidos — 20 vCards)
```javascript
// Pergunta iPhone ou Android → instrução de como enviar contatos
// Recebe vCards pelo WhatsApp → salva em contatos_referidos
// Meta: 20 contatos
// Quando tiver 20: envia mensagem pronta para encaminhar
// Depois pede profissão + hobby de cada uma (grupos de 5)
```

## Código Completo — Etapa 8 (Validação — Profissão/Hobby)
```javascript
// Processa respostas com Profissão: e Hobby: do lead
// Faz PATCH no Supabase para cada contato
// Quando todos preenchidos → mensagem final de encerramento
```

## Nós de Identidade (5 nós condicionais)

### Nó 1 — Identidade e Regras (gatilho: perguntas sobre médico/IA)
- Injeta currículo completo Dr. Vinícius e Dr. Malavasi
- Regras absolutas de comportamento

### Nó 2 — Científico + Compliance (gatilho: palavras como "estudo", "risco", "anvisa")
- WHI, ELITE Trial, GLADE, CLARA, E3N, Consenso BMJ
- Compliance CFM + ANVISA

### Nó 3 — Objeções + Fechamento (ISOLA)
- Técnica ISOLA para qualquer objeção
- Scripts específicos por tipo de objeção

### Nó 4 — Debate Técnico (gatilho: perfil médico/pesquisador)
- Metodologia completa de cada estudo
- DOIs, N amostral, limitações, contra-argumentos

### Nó 5 — E não definitivo (sentinel M4)
- Detecta NÃO definitivo (frases + 3 ciclos sem avanço)
- Registra flag em leads_m4_flag
- Aciona coleta de 4 referidos pós-NÃO

### Nó 6 — Agente Referidos Pós-NÃO
- Processa vCards após NÃO definitivo
- Meta: 4 contatos
- Depois pede profissão + hobby
