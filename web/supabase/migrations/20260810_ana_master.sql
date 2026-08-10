-- Ana DNA Nuclear — Phase 1 tables

create table if not exists ana_simulacoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  titulo text not null,
  descricao text,
  etapa text not null default 'geral',
  transcript text,
  observacoes text,
  score_geral numeric(4,1) not null default 7,
  score_conexao numeric(4,1) not null default 7,
  score_objecao numeric(4,1) not null default 7,
  score_fechamento numeric(4,1) not null default 7,
  aprovada boolean not null default false
);

create table if not exists ana_gold (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  etapa text not null default 'geral',
  categoria text not null default 'outro',
  titulo text not null,
  exemplo text not null,
  motivo text,
  sim_id uuid references ana_simulacoes(id) on delete set null
);

create table if not exists ana_anti_gold (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  etapa text not null default 'geral',
  categoria text not null default 'outro',
  titulo text not null,
  exemplo text not null,
  problema text,
  alternativa text,
  sim_id uuid references ana_simulacoes(id) on delete set null
);

create table if not exists ana_scorecard (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  sim_id uuid references ana_simulacoes(id) on delete set null,
  etapa text not null default 'geral',
  criterio text not null,
  score numeric(5,2) not null,
  max_score numeric(5,2) not null default 10,
  nota text
);

create table if not exists ana_matriz (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  habilidade text not null,
  descricao text,
  nivel text not null default 'nao_definido' check (nivel in ('nao_definido','raso','adequado','ouro')),
  evidencias text,
  proximos_passos text
);

create table if not exists ana_changelog (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  tipo text not null default 'decisao' check (tipo in ('decisao','aprendizado','diretriz','restricao')),
  titulo text not null,
  descricao text,
  impacto text,
  autor text
);

-- RLS: allow service role full access (used by API routes with service key)
alter table ana_simulacoes enable row level security;
alter table ana_gold enable row level security;
alter table ana_anti_gold enable row level security;
alter table ana_scorecard enable row level security;
alter table ana_matriz enable row level security;
alter table ana_changelog enable row level security;
