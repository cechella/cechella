# ANA — Proposta de Implementação VAPI (Ligações de Voz) v2.0

> **Status:** Proposta técnica — pendente de aprovação e configuração de credenciais.
> **Versão 2.0:** Canal PTL (Pega o Telefone e Liga) como canal PRIMÁRIO de aquisição via referidos.

---

## Conceito PTL — Por que ligar agora?

### A Metodologia PTL (Flávio Augusto / Wiser)

Popularizada por Flávio Augusto da Silva (Wiser), a estratégia PTL é simples: leads ficam "quentes" por uma janela curta após um ponto de contato positivo. Ligar dentro de 2–5 minutos aumenta drasticamente a taxa de atendimento e conversão — ligar 30 minutos depois reduz a taxa de contato em até 21 vezes.

### O Gatilho Perfeito: Aviso de Ana na Etapa 7

Quando uma paciente completa a Etapa 7 (Referidos), Ana envia mensagem de aviso para cada referido:

> "Uma consultora chamada Ana do Hormone Ecosystem vai te ligar agora."

Este aviso cria **expectativa ativa** — o referido está esperando a ligação. VAPI liga imediatamente, dentro de 2–5 minutos enquanto a janela de oportunidade está aberta.

### Fluxo PTL Completo

```
ETAPA 7 CONCLUÍDA
       │
       ▼ (Ana marca referidos como status="mensagem_enviada")
SUPABASE INSERT detectado pelo webhook n8n
       │
       ▼ (2–5 minutos após aviso)
VAPI inicia ligação outbound para o referido
       │
       ├── ATENDEU → conversa completa 8 etapas por VOZ
       │
       └── NÃO ATENDEU → nova tentativa (+2h, +4h)
                         └── 3ª tentativa falhou → WhatsApp Etapa 1 (fallback)
```

Este é o **canal PRIMÁRIO de aquisição** — não reativação de leads inativos.

---

## Arquitetura da Solução

```
ETAPA 7 (n8n existente)
  └── marca referidos: status="mensagem_enviada"
                │
                ▼
  SUPABASE webhook → n8n /webhook/vapi-ana (NOVO)
                │
                ▼
          VAPI Platform
  ┌─────────────────────────────────────────────────────┐
  │  Assistente: Ana Voz                                 │
  │  Modelo: claude-haiku-4-5-20251001                   │
  │  Voz: ElevenLabs (ID da voz da Ana)                 │
  │  System Prompt: versão adaptada para voz             │
  │                                                      │
  │  Function Calls durante ligação:                     │
  │  ├── get_lead_context(telefone)                      │
  │  ├── update_etapa(telefone, etapa)                   │
  │  ├── save_sintoma(telefone, sintoma)                 │
  │  └── register_interesse(telefone, metodo_pagamento)  │
  └─────────────────────────────────────────────────────┘
       │                              │
       ▼                              ▼
  Webhooks n8n                   Supabase
  (call.started,                 (leads.em_ligacao,
   call.ended,                    historico_voz)
   call.failed,
   function.called)
```

### Separação Total de Canais

| Canal WhatsApp (EXISTENTE) | Canal VAPI (NOVO) |
|---------------------------|-------------------|
| Webhook: `/webhook/hormone-agent` | Webhook: `/webhook/vapi-ana` |
| **Nunca modificado** | Completamente novo |
| Reads/writes: `leads.etapa_agente`, `contatos_referidos`, `leads_m4_flag` | Reads: `leads` (etapa, nome, dor) / Writes: `leads.em_ligacao`, `historico_voz` |

**Flag `em_ligacao`:** Enquanto verdadeiro, o fluxo WhatsApp ignora mensagens desse número — evita resposta duplicada.

---

## Lógica de Fallback — 3 Tentativas

| Tentativa | Delay | Se não atender | Ação |
|-----------|-------|----------------|------|
| 1ª | Imediata (2–5min após aviso) | Sem atendimento | Aguarda 2h |
| 2ª | +2 horas | Sem atendimento | Aguarda 2h |
| 3ª | +4 horas | Sem atendimento | → WhatsApp Etapa 1 (texto) |
| **Fallback** | Após 3ª tentativa | Sempre | Ana manda mensagem via Z-API (Etapa 1) |

Nenhum lead é perdido — se não atende por voz, entra pelo WhatsApp.

---

## Script de Voz — 8 Etapas Adaptadas

### System Prompt Base para Voz

```
Você é Ana, consultora do Hormone Ecosystem — ligando por telefone para [NOME].
Tom: caloroso, profissional, naturalmente humano.

REGRAS PARA VOZ:
- Frases curtas. Máximo 2 frases por turno.
- Confirme o que o lead disse antes de avançar.
- Se não entender: "Desculpe, pode repetir? A ligação cortou um pouquinho."
- Nunca mencione que é IA. Se perguntarem: "Sou consultora do Dr. Vinícius."
- Use function calls para atualizar o banco durante a ligação.
- Siga as mesmas 8 etapas do fluxo de mensagem.

ETAPA ATUAL: [injetada dinamicamente via get_lead_context]
NOME DO LEAD: [injetado]
DOR PRINCIPAL: [injetada se já coletada via WhatsApp]
```

### Diferenças Voz vs. Mensagem

| Mensagem (WhatsApp) | Voz (VAPI) |
|---------------------|-----------|
| Emojis e formatação rich | Sem emojis — linguagem natural |
| Parágrafos longos permitidos | Máx. 2 frases por turno |
| JSON estruturado como output | Confirmações verbais + function calls |
| Lead lê no próprio ritmo | Pausas naturais gerenciadas pelo VAPI |
| Interrupções: lead ignora | Detecção de interrupção nativa (barge-in) |

### Scripts por Etapa

**Etapa 1 — Apresentação (abertura PTL):**
> "Oi [nome]! Aqui é a Ana, consultora do Dr. Vinícius Cechella. Você recebeu um aviso que eu ia ligar, certo? Tenho uma coisa incrível pra te mostrar sobre sua saúde — posso falar um minutinho?"

**Etapa 2 — Conexão:**
> "Entendo. Baseado no que você me contou, [benefício específico] pode mudar completamente sua qualidade de vida. Você quer saber como funciona?"

**Etapas 3–8:** Seguem o mesmo script do WhatsApp adaptado para voz (frases curtas, confirmações verbais, sem emojis).

---

## Function Calls (VAPI Server Tools)

### `get_lead_context`
```json
{
  "name": "get_lead_context",
  "description": "Busca contexto do lead no banco antes de iniciar a conversa",
  "parameters": { "telefone": "string" }
}
```
**Retorna:** nome, etapa_atual, dor_principal, historico_resumido, metodo_contato_anterior

### `update_etapa`
```json
{
  "name": "update_etapa",
  "description": "Atualiza a etapa do lead no Supabase",
  "parameters": { "telefone": "string", "nova_etapa": "number", "observacao": "string" }
}
```

### `save_sintoma`
```json
{
  "name": "save_sintoma",
  "description": "Salva o sintoma principal identificado",
  "parameters": { "telefone": "string", "sintoma": "string" }
}
```

### `register_interesse`
```json
{
  "name": "register_interesse",
  "description": "Registra intenção de compra e método de pagamento preferido",
  "parameters": {
    "telefone": "string",
    "metodo": "cartao | pix | indeciso",
    "temperatura": "frio | morno | quente | fechado"
  }
}
```

### `schedule_whatsapp_followup`
```json
{
  "name": "schedule_whatsapp_followup",
  "description": "Agenda mensagem de follow-up no WhatsApp após a ligação",
  "parameters": {
    "telefone": "string",
    "tipo": "link_pagamento | mais_info | reagendamento",
    "delay_minutos": "number"
  }
}
```

---

## Configuração no VAPI Dashboard

### 1. Criar Assistente

```json
{
  "name": "Ana - Hormone Ecosystem",
  "model": {
    "provider": "anthropic",
    "model": "claude-haiku-4-5-20251001",
    "maxTokens": 500,
    "temperature": 0.7
  },
  "voice": {
    "provider": "11labs",
    "voiceId": "[ID_DA_VOZ_ANA_ELEVENLABS]",
    "stability": 0.5,
    "similarityBoost": 0.75
  },
  "firstMessage": "Oi! Aqui é a Ana, consultora do Hormone Ecosystem. Você recebeu um aviso que eu ia ligar — posso falar um minutinho?",
  "endCallFunctionEnabled": true,
  "endCallMessage": "Foi um prazer falar com você! Qualquer dúvida, é só me chamar no WhatsApp. Até logo!",
  "serverUrl": "https://n8n.hormoneecosystem.com/webhook/vapi-ana",
  "silenceTimeoutSeconds": 30,
  "maxDurationSeconds": 1800
}
```

### 2. Webhook n8n para VAPI

Criar novo fluxo no n8n (**NUNCA alterar o fluxo WhatsApp existente**):

```
Webhook: POST /webhook/vapi-ana
  └── Switch por event.type:
       ├── call.started  → get_lead_context do Supabase → injetar no VAPI
       ├── function.called → executar função (update_etapa, save_sintoma, etc.)
       ├── call.ended    → salvar resumo em historico_voz → disparar WhatsApp follow-up
       └── call.failed   → incrementar tentativas → se >= 3: WhatsApp Etapa 1
```

### 3. Tabela `historico_voz` (nova — não impacta fluxo existente)

```sql
CREATE TABLE historico_voz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone TEXT NOT NULL,
  call_id TEXT,
  duracao_segundos INTEGER,
  etapa_inicio INTEGER,
  etapa_fim INTEGER,
  temperatura_final TEXT,
  tentativas INTEGER DEFAULT 1,
  resumo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Escala — O Motor de Crescimento

| Mês | Pacientes Etapa 7 | Ligações VAPI | Novos leads (20% conv.) | Custo VAPI |
|-----|-------------------|---------------|------------------------|------------|
| 1 | 5 | 100 | 20 | ~R$ 140 |
| 2 | 20 | 400 | 80 | ~R$ 560 |
| 3 | 80 | 1.600 | 320 | ~R$ 2.240 |
| Referência humana | 80 consultores | 1.600 ligações manuais | — | ~R$ 40.000+ |

**ROI estimado:** Ticket R$5.000 × 15% conversão por voz = 15 vendas por 100 ligações = R$75.000 receita com custo VAPI de ~R$140. **ROI ~535x sobre o custo da plataforma.**

---

## Regras de Negócio para Voz

1. **Horário permitido:** 09h–20h (segunda a sábado) — VAPI verifica horário antes de cada chamada
2. **Máximo de tentativas:** 3 ligações por lead não atendido (intervalos de 2h)
3. **Opt-out:** Se lead pedir para não ligar mais → flag `no_call: true` no Supabase → VAPI ignora
4. **Flag em_ligacao:** Removida ao `call.ended` — WhatsApp volta a processar mensagens
5. **Privacidade:** Gravações armazenadas no R2 por 90 dias, depois deletadas automaticamente
6. **LGPD:** Aviso de Ana no WhatsApp ("vai te ligar agora") equivale a consentimento — documentado

---

## Plano de Implementação (8 passos)

| Passo | Tarefa | Responsável | Prazo |
|-------|--------|-------------|-------|
| 1 | Criar conta VAPI e obter API key | Vinícius | 1h |
| 2 | Clonar voz Ana no ElevenLabs (upload 2–5min áudio) | Vinícius | 2h |
| 3 | Criar assistente VAPI com system prompt base | Dev | 2h |
| 4 | Criar webhook n8n `/webhook/vapi-ana` | Dev | 3h |
| 5 | Implementar function calls no n8n | Dev | 4h |
| 6 | Criar tabela `historico_voz` no Supabase | Dev | 1h |
| 7 | Configurar trigger Etapa 7 → VAPI | Dev | 2h |
| 8 | Teste piloto com 10 referidos reais | Dev + Vinícius | 1 dia |

**Total estimado:** 3–5 dias úteis  
**Prerequisitos:** API Key VAPI + ElevenLabs Voice ID da Ana

---

## Próximos Passos

1. Aprovação desta proposta
2. Criação da conta VAPI (trial gratuito em vapi.ai)
3. Gravação de áudio de referência para clone de voz (2–5 minutos)
4. Implementação do webhook n8n (sem tocar no fluxo WhatsApp existente)
5. Teste piloto com 10 referidos da próxima paciente que completar Etapa 7

---

*Documento gerado em: 2026-07-31 · Versão 2.0*
