-- Ana Master · Conversation Recovery Engine — Fase 1.5
-- Todas as tabelas são prefixo ana_* e isoladas do schema de produção existente.

-- 1. Registro lógico por lead/conversa — sobrevive às chamadas
create table if not exists ana_conversations (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  lead_id         text not null,
  nome            text,
  telefone        text,
  source_type     text not null default 'desconhecido',
  referrer_name   text,
  referral_context text,
  status          text not null default 'ativa'
    check (status in ('ativa','recovery_pending','concluida','abandonada','opt_out')),
  stage           text not null default 'apresentacao',
  substage        text,
  stage_status    text not null default 'em_andamento'
    check (stage_status in ('em_andamento','gate_concluido','pulado')),
  completed_gates text[] not null default '{}',
  next_action     text,
  state_version   integer not null default 1,
  last_checkpoint timestamptz,
  recovery_count  integer not null default 0,
  lock_token      text
);

-- 2. Cada segmento/tentativa de chamada
create table if not exists ana_calls (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz,
  conversation_id  uuid not null references ana_conversations(id) on delete cascade,
  provider_call_id text,
  provider         text not null default 'twilio',
  started_at       timestamptz,
  ended_at         timestamptz,
  end_reason       text
    check (end_reason in ('normal','queda_tecnica','timeout','websocket_close','encerramento_voluntario','opt_out','desconhecido') or end_reason is null),
  attempt_number   integer not null default 1,
  duration_seconds integer
);

-- 3. Memória factual estruturada por conversa
create table if not exists ana_conversation_facts (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  conversation_id uuid not null references ana_conversations(id) on delete cascade,
  key             text not null,   -- ex: 'profissao', 'sintoma_principal', 'cidade', 'hobby'
  value           text not null,
  source_turn_id  text,
  confidence      text not null default 'confirmado'
    check (confidence in ('confirmado','inferido','conflito')),
  stage_captured  text,
  unique (conversation_id, key)    -- cada fato existe uma vez por conversa
);

-- 4. Event log append-only (auditoria / replay)
create table if not exists ana_conversation_events (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  conversation_id uuid not null references ana_conversations(id) on delete cascade,
  call_id         uuid references ana_calls(id) on delete set null,
  type            text not null,
  -- ex: 'fact_saved', 'gate_passed', 'call_dropped', 'recovery_started',
  --     'recovery_success', 'recovery_failed', 'objection_isolated',
  --     'payment_initiated', 'payment_confirmed', 'referral_received', 'session_locked'
  payload         jsonb,
  stage_at_event  text
  -- sem delete — tabela append-only
);

-- 5. Idempotência de tools externas
create table if not exists ana_tool_executions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  conversation_id uuid not null references ana_conversations(id) on delete cascade,
  call_id         uuid references ana_calls(id) on delete set null,
  tool            text not null,
  -- ex: 'generate_payment_link', 'verify_payment', 'send_whatsapp', 'register_referral'
  idempotency_key text not null unique,
  status          text not null default 'initiated'
    check (status in ('initiated','success','failed','reconciling')),
  result          jsonb,
  error           text
);

-- 6. Histórico de tentativas de recovery
create table if not exists ana_recovery_attempts (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  conversation_id uuid not null references ana_conversations(id) on delete cascade,
  call_id         uuid references ana_calls(id) on delete set null,
  attempt_no      integer not null default 1,
  status          text not null default 'agendada'
    check (status in ('agendada','em_andamento','sucesso','falha','cancelada')),
  scheduled_at    timestamptz,
  started_at      timestamptz,
  completed_at    timestamptz,
  reason          text,
  outcome         text,
  resume_context  jsonb   -- snapshot gerado para reidratação do modelo
);

-- 7. Persistência granular de referidos (etapas 7/8)
create table if not exists ana_referrals (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz,
  conversation_id   uuid not null references ana_conversations(id) on delete cascade,
  contact_key       text not null,   -- nome ou identificador único do contato
  telefone          text,
  profissao         text,
  hobby             text,
  validation_status text not null default 'pendente'
    check (validation_status in ('pendente','parcial','completo')),
  whatsapp_status   text not null default 'nao_enviado'
    check (whatsapp_status in ('nao_enviado','enviado','entregue','falhou')),
  message_id        text,
  unique (conversation_id, contact_key)
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table ana_conversations          enable row level security;
alter table ana_calls                  enable row level security;
alter table ana_conversation_facts     enable row level security;
alter table ana_conversation_events    enable row level security;
alter table ana_tool_executions        enable row level security;
alter table ana_recovery_attempts      enable row level security;
alter table ana_referrals              enable row level security;

-- ── Índices de performance ───────────────────────────────────────────────────
create index if not exists idx_ana_calls_conversation        on ana_calls(conversation_id);
create index if not exists idx_ana_facts_conversation        on ana_conversation_facts(conversation_id);
create index if not exists idx_ana_events_conversation       on ana_conversation_events(conversation_id);
create index if not exists idx_ana_events_type               on ana_conversation_events(type);
create index if not exists idx_ana_tool_exec_idem_key        on ana_tool_executions(idempotency_key);
create index if not exists idx_ana_recovery_conversation     on ana_recovery_attempts(conversation_id);
create index if not exists idx_ana_referrals_conversation    on ana_referrals(conversation_id);
create index if not exists idx_ana_conversations_lead        on ana_conversations(lead_id);
create index if not exists idx_ana_conversations_status      on ana_conversations(status);
