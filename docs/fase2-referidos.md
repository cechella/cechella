# Hormone Ecosystem — Fase 2: Sistema de Referidos
**Data:** 19/06/2026  
**Projeto:** hormoneecosystem.com  
**Responsável:** Dr. Vinícius Cechella

---

## Visão Geral

Quando Ana (agente IA) finaliza a conversa com um lead e coleta os referidos no WhatsApp, esses dados precisam ser salvos de forma organizada no banco de dados e visíveis no painel admin para que os agentes humanos saibam em quem ligar primeiro.

---

## Fluxo Completo

### Como funciona hoje (Fase 1 — concluída)

1. Lead entra em contato via WhatsApp
2. Ana conduz o funil de 7 etapas:
   - Etapa 1 — Apresentação (coleta nome)
   - Etapa 2 — Conexão (coleta profissão, dor)
   - Etapa 3 — D.I. (aprofunda dor principal)
   - Etapa 4 — Speech (apresenta o implante)
   - Etapa 5 — Fechamento (apresenta preço, forma de pagamento)
   - Etapa 6 — Referidos (coleta 20 contatos com profissão + hobby)
   - Etapa 7 — Validação (confirma e encerra)
3. Dados do lead salvos na tabela `leads` no Supabase
4. Admin mostra conversa em tempo real

### O que muda na Fase 2

Na Etapa 6, Ana pede ao lead:
- 20 contatos de mulheres conhecidas
- Nome, telefone, profissão e hobby de cada uma

Esses dados precisam ser **salvos estruturados** na tabela `referidos` e **exibidos no admin** em ordem de prioridade para os agentes.

---

## Banco de Dados — Tabela `referidos`

```sql
CREATE TABLE referidos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  indicado_por_telefone text,    -- telefone do lead que indicou
  indicado_por_nome text,        -- nome do lead que indicou
  nome text,                     -- nome do referido
  telefone text,                 -- telefone do referido
  profissao text,                -- profissão do referido
  hobby text,                    -- hobby do referido
  prioridade integer DEFAULT 2,  -- 1=alta (tem profissão+hobby), 2=normal
  status text DEFAULT 'aguardando',
  created_at timestamptz DEFAULT now()
);
```

### Regra de Prioridade

| Prioridade | Critério |
|------------|----------|
| 1 — Alta | Tem nome + telefone + profissão + hobby |
| 2 — Normal | Tem apenas nome + telefone |

**Justificativa:** Referidos com profissão e hobby permitem que o agente personalize a abordagem antes de ligar, aumentando a taxa de conversão.

---

## n8n — Novos Nós

### Nó 1: "Parsear Referidos" (Code)

Posição no workflow: após o nó **Salvar Supabase**

**Função:** Recebe o texto livre enviado pelo lead no WhatsApp e extrai os dados de cada referido.

**Lógica:**
1. Verifica se `proximaEtapa >= 6`
2. Divide o texto por linha
3. Para cada linha, extrai: número, nome, telefone, profissão, hobby
4. Define prioridade: 1 se tem profissão+hobby, 2 se não tem
5. Retorna array de objetos prontos para inserir no Supabase

**Exemplo de entrada (mensagem do lead):**
```
1. Maria Silva - yoga e meditação - (48) 99901-1001
2. Ana Paula Souza - pilates e culinária - (48) 99901-1002
```

**Exemplo de saída (objeto por referido):**
```json
{
  "indicado_por_telefone": "554888416899",
  "indicado_por_nome": "Julia",
  "nome": "Maria Silva",
  "telefone": "554899901-1001",
  "hobby": "yoga e meditação",
  "profissao": null,
  "prioridade": 1
}
```

### Nó 2: "Salvar Referidos" (HTTP Request)

**Método:** POST  
**URL:** `https://rmsblsoqqhtantyomhsh.supabase.co/rest/v1/referidos`  
**Headers:**
- `apikey`: chave do Supabase
- `Authorization`: Bearer + chave
- `Content-Type`: application/json
- `Prefer`: resolution=merge-duplicates

---

## Admin — Nova Página: Referidos Qualificados

**URL:** `hormoneecosystem.com/admin/referidos`

### Tabela de Leads Qualificados

| Campo | Descrição |
|-------|-----------|
| Prioridade | 🔥 Alta (tem profissão+hobby) ou 🟡 Normal |
| Nome | Nome do referido |
| Telefone | Telefone para contato |
| Profissão | Profissão (se coletada) |
| Hobby | Hobby (se coletado) |
| Indicado por | Nome do lead que indicou |
| Status | aguardando / contatado / fechado |
| Ação | Botão "Marcar como contatado" |

### Filtros disponíveis
- Por status: aguardando, contatado, fechado
- Por prioridade: Alta, Normal
- Por quem indicou (lead)

### Ordenação padrão
1. Prioridade 1 (Alta) primeiro
2. Dentro de cada prioridade: mais recentes primeiro

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| n8n workflow | Adicionar 2 nós | Parsear Referidos + Salvar Referidos |
| `web/app/admin/referidos/page.tsx` | Criar | Nova página no admin |
| `web/app/admin/referidos/columns.tsx` | Criar | Colunas da tabela |
| `web/lib/supabase.ts` | Modificar | Adicionar query para referidos |

---

## Resultado Esperado

Após a Fase 2:

1. Ana coleta referidos normalmente via WhatsApp
2. Cada referido é automaticamente salvo e qualificado no banco
3. Admin mostra tabela ordenada por prioridade
4. Agente vê: "Maria Silva, médica, pratica yoga — indicada por Julia" e liga com contexto completo
5. Taxa de conversão dos referidos aumenta pois o agente já sabe com quem está falando

---

## Status Atual

| Item | Status |
|------|--------|
| Tabela `referidos` criada no Supabase | ✅ Concluído |
| Colunas profissao, hobby, prioridade adicionadas | ✅ Concluído |
| Nó Parsear Referidos no n8n | 🔲 Pendente |
| Nó Salvar Referidos no n8n | 🔲 Pendente |
| Página /admin/referidos | 🔲 Pendente |

---

*Documento gerado em 19/06/2026 — Hormone Ecosystem*
