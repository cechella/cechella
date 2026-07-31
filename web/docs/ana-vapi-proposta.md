# ANA — Proposta de Implementação VAPI (Ligações de Voz)

> **Status:** Proposta técnica — pendente de aprovação e configuração de credenciais.

---

## Objetivo

Replicar via ligação telefônica (voz) o mesmo funil de 8 etapas que Ana já executa por mensagem no WhatsApp — com o mesmo script, mesmas regras de avanço e mesma integração com Supabase.

---

## Por que VAPI?

| Critério | VAPI | Twilio Voice + ElevenLabs | Retell AI |
|----------|------|--------------------------|-----------|
| Latência | ~500ms (melhor) | ~1.2s | ~700ms |
| Síntese de voz | ElevenLabs nativo | ElevenLabs via custom | ElevenLabs nativo |
| Custo/min | ~$0,05 | ~$0,08 | ~$0,07 |
| Integração n8n | Webhook direto | Mais complexo | Webhook direto |
| LLM livre | Sim (Claude) | Sim | Sim (Claude) |
| Detecção de silêncio | Nativa | Manual | Nativa |
| Função calls mid-call | Sim | Não nativo | Sim |

**VAPI é a melhor escolha:** menor latência, suporte nativo a ElevenLabs, function calls para atualizar Supabase durante a ligação, e integração direta com n8n via webhook.

---

## Arquitetura da Solução

```
Lead recebe ligação
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
  (call.started,                 (leads, historico_voz)
   call.ended,
   function.called)
```

---

## Como Funciona o Fluxo de Voz

### Gatilho da Ligação

A ligação pode ser iniciada de 3 formas:
1. **Retorno de lead inativo** — n8n detecta lead parado há X dias e dispara chamada outbound
2. **Solicitação via WhatsApp** — lead pede para falar com alguém, Ana agenda ligação pelo VAPI
3. **Após pagamento** — VAPI liga automaticamente para onboarding pós-compra

### Fluxo da Conversa (Etapas Adaptadas para Voz)

O script de voz segue as mesmas 8 etapas, mas adaptado para linguagem falada:

**Diferenças voz vs. mensagem:**
- Sem emojis
- Frases mais curtas (máx. 2 linhas por turno)
- Confirmações verbais em vez de JSON
- Pausas naturais com silêncio gerenciado pelo VAPI
- Detecção de interrupção (lead fala por cima)

### System Prompt para Voz (base)

```
Você é Ana, consultora do Hormone Ecosystem — ligando por telefone.
Tom: caloroso, profissional, naturalmente humano.

REGRAS PARA VOZ:
- Frases curtas. Máximo 2 frases por turno.
- Confirme o que o lead disse antes de avançar.
- Se não entender, diga: "Desculpe, pode repetir? A ligação cortou um pouquinho."
- Nunca mencione que é IA. Se perguntarem: "Sou consultora do Dr. Vinícius."
- Use function calls para atualizar o banco durante a ligação.
- Siga as mesmas 8 etapas do fluxo de mensagem.

ETAPA ATUAL: [injetada dinamicamente via get_lead_context]
NOME DO LEAD: [injetado]
DOR PRINCIPAL: [injetada se já coletada via WhatsApp]
```

---

## Function Calls (VAPI Server Tools)

Estas funções são executadas pelo VAPI durante a ligação via webhook para o n8n:

### `get_lead_context`
```json
{
  "name": "get_lead_context",
  "description": "Busca contexto do lead no banco antes de iniciar a conversa",
  "parameters": {
    "telefone": "string"
  }
}
```
**Retorna:** nome, etapa_atual, dor_principal, historico_resumido, metodo_contato_anterior

### `update_etapa`
```json
{
  "name": "update_etapa",
  "description": "Atualiza a etapa do lead no Supabase",
  "parameters": {
    "telefone": "string",
    "nova_etapa": "number",
    "observacao": "string"
  }
}
```

### `save_sintoma`
```json
{
  "name": "save_sintoma",
  "description": "Salva o sintoma principal identificado",
  "parameters": {
    "telefone": "string",
    "sintoma": "string"
  }
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
  "firstMessage": "Oi! Aqui é a Ana, consultora do Hormone Ecosystem. Tudo bem? Posso falar um minutinho?",
  "endCallFunctionEnabled": true,
  "endCallMessage": "Foi um prazer falar com você! Qualquer dúvida, é só me chamar no WhatsApp. Até logo! 😊",
  "serverUrl": "https://n8n.hormoneecosystem.com/webhook/vapi-ana",
  "silenceTimeoutSeconds": 30,
  "maxDurationSeconds": 1800
}
```

### 2. Configurar Voz no ElevenLabs

Para clonar a voz da Ana (se houver áudio de referência):
1. Acessar ElevenLabs → Voice Lab → Add Voice
2. Fazer upload de 2–5 minutos de áudio da Ana atual
3. Nomear: "Ana - Hormone Ecosystem"
4. Copiar o `voiceId` para o assistente VAPI

Se não há áudio de referência, recomendar voices pré-existentes:
- **"Rachel"** (11labs) — voz feminina, calorosa, brasileira compatível com PT-BR
- **"Bella"** (11labs) — voz suave, consultiva

### 3. Webhook n8n para VAPI

Criar novo fluxo no n8n (NUNCA alterar o fluxo de WhatsApp existente):

```
Webhook: POST /webhook/vapi-ana
  └── Switch por event.type:
       ├── call.started → get_lead_context do Supabase → injetar no VAPI
       ├── function.called → executar função (update_etapa, save_sintoma, etc.)
       └── call.ended → salvar resumo + disparar WhatsApp follow-up
```

---

## Integração WhatsApp ↔ Voz

A grande vantagem é que o contexto é **compartilhado**. Se o lead já passou pela Etapa 1 via WhatsApp, a ligação começa na Etapa 2. O histórico é unificado no Supabase.

### Tabela `historico_voz` (nova, não impacta fluxo existente)

```sql
CREATE TABLE historico_voz (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone TEXT NOT NULL,
  call_id TEXT,
  duracao_segundos INTEGER,
  etapa_inicio INTEGER,
  etapa_fim INTEGER,
  temperatura_final TEXT,
  resumo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Custos Estimados

| Volume | Custo VAPI | Custo ElevenLabs | Total/mês |
|--------|-----------|-----------------|-----------|
| 100 ligações × 5min | ~R$ 140 | ~R$ 30 | **~R$ 170** |
| 500 ligações × 5min | ~R$ 700 | ~R$ 120 | **~R$ 820** |
| 1.000 ligações × 5min | ~R$ 1.400 | ~R$ 220 | **~R$ 1.620** |

*Câmbio aproximado: $1 = R$ 5,60*

**Comparativo:** Consultor humano realizando 1.000 ligações de 5min = ~83h = ~R$ 8.000+

---

## Plano de Implementação (8 passos)

| Passo | Tarefa | Responsável | Prazo |
|-------|--------|-------------|-------|
| 1 | Criar conta VAPI e obter API key | Vinícius | 1h |
| 2 | Criar voz no ElevenLabs (clone ou escolha) | Vinícius | 2h |
| 3 | Criar assistente VAPI com system prompt base | Dev | 2h |
| 4 | Criar webhook n8n `/webhook/vapi-ana` | Dev | 3h |
| 5 | Implementar function calls no n8n | Dev | 4h |
| 6 | Criar tabela `historico_voz` no Supabase | Dev | 1h |
| 7 | Testar ligação outbound com número de teste | Dev + Vinícius | 2h |
| 8 | Ativar para leads reais em fase piloto (10 leads) | Dev + Vinícius | 1 dia |

**Total estimado:** 3–5 dias úteis

---

## Regras de Negócio para Voz

1. **Horário permitido:** 09h–20h (segunda a sábado) — nunca ligar fora deste horário
2. **Máximo de tentativas:** 3 ligações por lead não atendido (intervalos de 2h)
3. **Opt-out:** Se lead pedir para não ligar mais → flag `no_call: true` no Supabase
4. **Privacidade:** Todas as gravações armazenadas no R2 por 90 dias, depois deletadas
5. **LGPD:** Consentimento via WhatsApp antes da primeira ligação outbound

---

## Próximos Passos

1. Aprovação desta proposta
2. Criação da conta VAPI (trial gratuito disponível)
3. Envio do áudio de referência para clone de voz (opcional)
4. Implementação do webhook n8n (sem tocar no fluxo existente)
5. Teste piloto com 10 leads

---

*Documento gerado em: 2026-07-31*
