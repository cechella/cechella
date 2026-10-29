-- Plataforma de aprendizado da Ana (WhatsApp). Só cria tabelas novas; nada existente é alterado.
-- Rodar uma vez no SQL Editor do Supabase.

-- Parte 1: pasta de conhecimento. status: rascunho (não usado) | teste (só grupo B) | ativo (todos) | inativo
create table if not exists ana_conhecimento (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  conteudo text not null,
  etapa int check (etapa between 1 and 8),          -- null = todas as etapas
  situacao text,                                     -- ex.: preco, decisor, indicacao, rapport
  status text not null default 'rascunho' check (status in ('rascunho','teste','ativo','inativo')),
  fonte text,
  testado_desde timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ana_conhecimento_status_idx on ana_conhecimento (status, etapa);

-- Parte 2: trechos de conversas que viraram venda
create table if not exists ana_exemplos (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid,
  telefone text not null,
  etapa int not null check (etapa between 1 and 8),
  trecho jsonb not null,                             -- [{role, content}]
  destaque boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (telefone, etapa)
);
create index if not exists ana_exemplos_etapa_idx on ana_exemplos (etapa, ativo, destaque);

-- Parte 3: relatórios semanais e sugestões para aprovação
create table if not exists ana_relatorios (
  id uuid primary key default gen_random_uuid(),
  periodo_inicio timestamptz not null,
  periodo_fim timestamptz not null,
  metricas jsonb not null,
  analise text,
  created_at timestamptz not null default now()
);

create table if not exists ana_sugestoes (
  id uuid primary key default gen_random_uuid(),
  relatorio_id uuid references ana_relatorios(id) on delete cascade,
  titulo text not null,
  conteudo text not null,
  etapa int check (etapa between 1 and 8),
  situacao text,
  justificativa text,
  status text not null default 'pendente' check (status in ('pendente','aprovada','recusada')),
  conhecimento_id uuid references ana_conhecimento(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Acesso só pelo servidor (chave de serviço). Sem políticas = nenhum acesso pela chave pública.
alter table ana_conhecimento enable row level security;
alter table ana_exemplos     enable row level security;
alter table ana_relatorios   enable row level security;
alter table ana_sugestoes    enable row level security;
