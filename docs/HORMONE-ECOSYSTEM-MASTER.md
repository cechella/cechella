# HORMONE ECOSYSTEM — DOCUMENTO MASTER OFICIAL
**hormoneecosystem.com**
Responsável: Dr. Vinícius Cechella
Atualizado: 26/06/2026 — Versão 2.0

---

## 1. VISÃO GERAL DO ECOSSISTEMA

O Hormone Ecosystem é uma plataforma digital completa para o Dr. Vinícius Cechella, especialista em implante hormonal. O sistema integra captação de leads via Instagram, atendimento automatizado por IA no WhatsApp, gestão de pacientes, educação médica, treinamento de consultores e crescimento viral exponencial em uma única plataforma.

### Os 5 Pilares

| Pilar | URL | Descrição |
|-------|-----|-----------|
| Área do Paciente | /patient | Portal exclusivo pós-compra com vídeos, evidências e acompanhamento |
| Hormone Academy | /medical | Educação e mentoria para médicos parceiros |
| Sales Academy | /sales | CRM e treinamento para consultores de vendas |
| Admin Master | /admin | Gestão completa: leads, CRM, IA, referidos e analytics |
| Motor Viral | — | Sistema de referidos exponencial automatizado |

### Diferencial Competitivo
- Ana IA atende leads 24h/7 dias no WhatsApp com funil de 8 etapas
- Cada venda gera 20 referidos qualificados automaticamente
- Crescimento exponencial sem custo adicional por atendimento
- Botão opt-out conforme LGPD via Meta API
- Dr. Vinícius presente em todo o funil (áudio/clone IA — próxima fase)

---

## 2. TECNOLOGIAS E INFRAESTRUTURA

| Componente | Tecnologia | Função |
|------------|------------|--------|
| Frontend | Next.js 14 + TypeScript | Interface web da plataforma |
| Hospedagem | Vercel | Deploy automático via GitHub |
| Banco de Dados | Supabase (PostgreSQL) | Leads, referidos, usuários, conteúdo |
| Autenticação | Supabase Auth | Login com roles por perfil |
| Realtime | Supabase Realtime | Pipeline ao vivo no admin |
| Arquivos | Cloudflare R2 | Vídeos e documentos |
| Automação | n8n (self-hosted GCP) | Orquestrador de todos os fluxos |
| WhatsApp Principal | Z-API | Envio e recebimento de mensagens da Ana |
| WhatsApp Templates | Meta Business API | Botões interativos e opt-out |
| IA | Claude Haiku (Anthropic) | Cérebro da Ana |
| Instagram | ManyChat | Captura de leads nos comentários |
| Pagamento | Mercado Pago PIX | Cobrança automatizada R$ 5.000 |
| Webhook Meta | hormoneecosystem.com/api/webhook/meta | Proxy HTTPS → n8n |
| Repositório | GitHub cechella/cechella | Controle de versão |
| Servidor n8n | GCP 35.255.229.131:5678 | Sem SSL (HTTP interno) |

---

## 3. ÁREA DO PACIENTE — /patient

Portal exclusivo liberado automaticamente após confirmação de pagamento.

| Página | Conteúdo |
|--------|----------|
| /patient/dashboard | Visão geral do tratamento e próximos passos |
| /patient/videos | Biblioteca de vídeos educativos sobre o implante |
| /patient/evidencia | Evidências científicas e estudos clínicos |
| /patient/cases | Casos clínicos e resultados de outros pacientes |
| /patient/schedule | Agendamento e histórico de consultas |

**Próximo passo:** vídeo de boas-vindas do clone do Dr. Vinícius (HeyGen)

---

## 4. ÁREA MÉDICA — HORMONE ACADEMY — /medical

Plataforma de educação e mentoria para médicos parceiros que querem aprender e aplicar o implante hormonal.

| Página | Conteúdo |
|--------|----------|
| /medical/dashboard | Progresso nas trilhas e certificados do médico |
| /medical/courses | Trilhas de aprendizado sobre implante hormonal |
| /medical/library | Biblioteca com artigos e estudos científicos |
| /medical/community | Comunidade: discussões e casos clínicos entre médicos |
| /medical/certificates | Certificados emitidos após conclusão das trilhas |

**Modelo de negócio médico:**
- Médicos parceiros pagam mensalidade para acessar a Academy
- Recebem suporte do Dr. Vinícius para aplicar o implante em suas clínicas
- Dr. Vinícius se torna referência nacional em implante hormonal

---

## 5. SALES ACADEMY — ÁREA DOS CONSULTORES — /sales

Ambiente exclusivo para consultores de vendas com CRM próprio e treinamento.

| Página | Conteúdo |
|--------|----------|
| /sales/dashboard | Métricas pessoais: vendas, comissões, metas |
| /sales/training | Treinamentos e scripts de vendas |
| /sales/crm | CRM próprio com seus leads e pipeline |
| /sales/ranking | Ranking de performance da equipe |

---

## 6. PAINEL ADMIN MASTER — /admin

Gestão completa exclusiva para Dr. Vinícius e gestores.

| Página | Função | Status |
|--------|--------|--------|
| /admin/dashboard | Métricas gerais + Pipeline ao vivo (Realtime) | ✅ Construído |
| /admin/crm | CRM completo com funil 8 etapas e todos os leads | ✅ Construído |
| /admin/analytics | Conversões, funil, receita e performance real | ✅ Construído |
| /admin/rede | Rede exponencial de referidos com scores | ✅ Construído |
| /admin/agente | Monitor da Ana: conversas em tempo real | 🔄 Pendente |
| /admin/referidos | Referidos qualificados com prioridade e status | 🔄 Pendente |
| /admin/videos | Gestão dos vídeos da área do paciente | 🔄 Pendente |
| /admin/users | Gestão de usuários: pacientes, médicos, consultores | 🔄 Pendente |

---

## 7. AGENTE IA ANA — O MOTOR DE VENDAS

Ana é a consultora de IA que atende leads 24h/7 dias no WhatsApp. Conduz o funil com personalidade, empatia e script preciso.

### Características
- **Modelo:** Claude Haiku (Anthropic) — rápido e econômico
- **Personalidade:** consultora feminina, empática e especialista em hormônio
- **NUNCA** menciona menopausa a menos que o lead mencione primeiro
- **NUNCA** menciona consulta, agendamento ou exames
- Segue o script exatamente — sem adicionar informações não autorizadas

### Nós no n8n (Workflow: Hormone Agent — Dr. Vinícius 7 Passos)

| Nó n8n | Função |
|--------|--------|
| Webhook Evolution API | Recebe mensagem do WhatsApp via Z-API |
| Filtrar Mensagens | Ignora mensagens de status e grupos |
| Extrair Mensagem | Extrai texto, telefone e mídia |
| Buscar Lead Supabase | Consulta contexto do lead no Supabase |
| Montar Prompt | Constrói o prompt com script da etapa correta |
| Chamar Claude API | Envia para Claude Haiku e recebe resposta |
| Processar Resposta | Extrai resposta JSON, avança etapa |
| Code in JavaScript | Lógica adicional de negócio |
| Enviar WhatsApp | Envia resposta via Z-API |
| Parsear Referidos | Extrai os 20 contatos do vCard |
| Salvar Profissão Hobby | Salva profissão/hobby dos referidos |
| Gerar Pagamento | Cria PIX via Mercado Pago |
| Acionar Referidos Auto | Ana contata top referidos por score após etapa 8 |

---

## 8. AS 8 ETAPAS DO FUNIL DE VENDAS

| Etapa | Nome | Objetivo | O que Ana faz |
|-------|------|----------|---------------|
| 1 | Apresentação | Coletar nome | Se apresenta, pergunta nome e sintomas |
| 2 | Conexão | Gerar rapport | Profissão, hobby, dor principal |
| 3 | D.I. | Aprofundar dor | Explora impacto na vida do lead |
| 4 | Speech | Apresentar solução | Apresenta o implante hormonal |
| 5 | Fechamento | Fechar venda | R$ 5.000 — PIX ou cartão |
| 6 | Pag. Pendente | Aguardar pagamento | Acompanha confirmação do PIX |
| 7 | Referidos | Coletar 20 contatos | Nome, telefone, profissão e hobby |
| 8 | Validação | Confirmar e encerrar | Negativos, profissão+hobby, dispara referidos |

> **Regra crítica:** Ana NUNCA encerra sem perguntar negativos e coletar profissão+hobby de cada referido na Etapa 8.

---

## 9. SISTEMA DE REFERIDOS — MOTOR VIRAL

Cada cliente indica 20 conhecidas que se tornam novos leads qualificados.

### Estrutura de dados (tabela contatos_referidos)

| Campo | Descrição |
|-------|-----------|
| nome | Nome do referido |
| telefone | Telefone do referido |
| profissao | Profissão (coletada na Etapa 8) |
| hobby | Hobby (coletado na Etapa 8) |
| status | aguardando → contatado → fechado |
| indicado_por_telefone | Telefone do lead que indicou |
| score | rendaScore(5/3/2/1) + dadosScore(3/1/0) = máx 8pts |

### Scoring de Prioridade (Ranking Ana)

| Score | Critério | Exemplo |
|-------|----------|---------|
| 8 pts | Renda alta + tem profissão e hobby | Médica com hobby |
| 6 pts | Renda alta + tem só profissão | Advogada sem hobby |
| 5 pts | Renda média + profissão e hobby | Professora com hobby |
| 2 pts | Sem dados | Só nome e telefone |

**Profissões de renda alta (5pts):** médic, dentist, advogad, empresári, diretor, ceo, cfo, gerente, consultor, arquitet, veterinári, farmacêut, engenhei, jogador

**Profissões de renda média (3pts):** professor, enfermei, fisio, nutricion, psicolog, contador, administr, tecnolog, analista, desenvolv, designer

### Acionar Referidos Automático
Após salvar profissão/hobby (Etapa 8), Ana envia WhatsApp automaticamente para os top referidos em ordem de score — mensagem personalizada por profissão com delay de 2s entre envios. Máximo 10 por disparo.

### Opt-out — LGPD
Leads que dizem "não tenho interesse" ou após 3 tentativas sem conversão recebem botão de opt-out via Meta API. Ao confirmar, campo `optout: true` é salvo e Ana nunca mais contata.

### Cashback Fidelização
Paciente que validar 20 referidos pagantes recebe **10% de desconto na renovação** do próximo implante + e-mail de agradecimento automático.

---

## 10. CRESCIMENTO EXPONENCIAL

| Geração | Vendas | Referidos gerados |
|---------|--------|-------------------|
| Geração 1 — vendas diretas | 1 venda | 20 referidos |
| Geração 2 — 25% compram | 5 vendas | 100 referidos |
| Geração 3 — 25% compram | 25 vendas | 500 referidos |
| Geração 4 — 25% compram | 125 vendas | 2.500 referidos |

**Ana gerencia todas as gerações simultaneamente. Sem limite de conversas paralelas.**

Por que referidos convertem mais:
- Indicação pessoal (confiança prévia)
- Abordagem 100% personalizada por profissão/hobby
- Prova social do resultado da indicadora
- Custo de aquisição: quase zero

---

## 11. FLUXO COMPLETO — INSTAGRAM AO FECHAMENTO

| Etapa | O que acontece |
|-------|----------------|
| 1. Reels / Tráfego pago | Lead vê o conteúdo no Instagram |
| 2. Comentário "implante" | ManyChat responde automaticamente no Direct |
| 3. Link WhatsApp | ManyChat envia link para o WhatsApp |
| 4. Ana assume | Inicia as 8 etapas imediatamente |
| 5. Fechamento | Ana fecha a venda — R$ 5.000 |
| 6. PIX confirmado | Mercado Pago webhook confirma pagamento |
| 7. Acesso liberado | ManyChat pós-venda entrega link da plataforma |
| 8. Etapa 7 — Referidos | Ana coleta 20 contatos via vCard |
| 9. Etapa 8 — Validação | Ana coleta profissão+hobby, dispara referidos |
| 10. Acionar Referidos Auto | Top referidos por score recebem WhatsApp da Ana |
| 11. Crescimento | Cada venda = 20 novas oportunidades qualificadas |

---

## 12. META WHATSAPP BUSINESS API

Configurado em paralelo com Z-API para templates com botões profissionais.

| Dado | Valor |
|------|-------|
| App | Hormoneecosystem |
| Phone Number ID | 1236713569518754 |
| WhatsApp Business Account ID | 4370540856530050 |
| Webhook URL | https://hormoneecosystem.com/api/webhook/meta |
| Verify Token | cechella2026 |
| Workflow n8n | Meta WhatsApp — Botões |

**Templates planejados:**
- Opt-out: "Sim, pode parar" / "Quero saber mais"
- Cashback renovação: aviso de 10% de desconto
- Boas-vindas pós-venda com botão para acessar plataforma

---

## 13. ROADMAP — 4 FASES

### Fase 1 — Impacto Imediato ✅ CONCLUÍDA
- [x] Ana concierge no WhatsApp com IA Claude
- [x] 8 etapas de atendimento automatizado
- [x] Pagamento PIX via Mercado Pago
- [x] Coleta de referidos via vCard
- [x] Admin dashboard com pipeline ao vivo
- [x] CRM com funil visual
- [x] Analytics com dados reais
- [x] /admin/rede com visualização exponencial

### Fase Viral — Crescimento Exponencial 🔄 EM CONSTRUÇÃO
- [x] Scoring de referidos por renda (max 8pts)
- [x] Acionar Referidos Auto após Etapa 8
- [x] Dashboard /admin/rede em tempo real
- [ ] Opt-out com botão Meta API (configurando)
- [ ] Cashback 10% por 20 referidos pagantes
- [ ] Corrigir sem_telefone_indicador no Acionar Referidos
- [ ] Token permanente Meta API (System User)

### Fase 2 — Automação Completa 📋 PRÓXIMO MÊS
- [ ] Nota fiscal automática pós-pagamento
- [ ] Termo de consentimento digital
- [ ] Agendamento via Calendly integrado
- [ ] E-mail de boas-vindas pós-compra
- [ ] Área do paciente /patient completa
- [ ] ManyChat pós-venda com acesso automático
- [ ] Clone IA Dr. Vinícius (HeyGen)
- [ ] Áudio de boas-vindas Dr. Vinícius no WhatsApp

### Fase 3 — Escala 🚀 FUTURO
- [ ] Hormone Academy para médicos parceiros
- [ ] Sales Academy para consultores
- [ ] CRM completo com histórico clínico
- [ ] Pedido automático ao fornecedor
- [ ] Follow-up pós-implante (30, 60, 90 dias)
- [ ] App próprio para pacientes
- [ ] Expansão para clínicas franqueadas
- [ ] Teleconsulta automatizada (CFM 2.314/2022)

---

## 14. CREDENCIAIS E CONFIGURAÇÕES

| Sistema | Dado |
|---------|------|
| Supabase URL | https://rmsblsoqqhtantyomhsh.supabase.co |
| Z-API Instance | 3DF0F4E14ADF3A9EF27059B99E2ECE64 |
| n8n URL | http://35.255.229.131:5678 |
| Vercel | vcechella-4638s-projects |
| GitHub Branch | claude/festive-brahmagupta-ph81za |
| Admin URL | https://hormoneecosystem.com/admin |

---

*Documento gerado e mantido automaticamente pelo sistema Claude Code.*
*Próxima atualização: a cada nova fase concluída.*
