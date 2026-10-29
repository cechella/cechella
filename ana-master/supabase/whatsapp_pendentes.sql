-- Mensagens do N8N que a Meta recusou por estar fora da janela de 24h.
-- Ficam aqui até o lead responder ao template de retomada; então são entregues em ordem.
create table if not exists whatsapp_pendentes (
  id uuid primary key default gen_random_uuid(),
  telefone text not null,
  mensagem text not null,
  motivo text,
  template_enviado boolean not null default false,
  entregue_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists whatsapp_pendentes_tel_idx on whatsapp_pendentes (telefone, entregue_em, created_at);
alter table whatsapp_pendentes enable row level security;
