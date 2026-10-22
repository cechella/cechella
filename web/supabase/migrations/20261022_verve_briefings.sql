-- VERVE: briefings propostos pelo Gustavo (ATLAS) e aprovados pelo CEO. Idempotente: pode rodar mais de uma vez.
-- Quem executa: o CEO, no SQL Editor do Supabase. A API do VERVE usa a chave de serviço (ignora RLS); anon/authenticated não acessam.
-- O ATLAS NUNCA recebe a chave de serviço: ele fala só com a API, usando o token dedicado VERVE_ATLAS_TOKEN (ver web/docs/verve/CONTRATO.md).

create extension if not exists pgcrypto;

create table if not exists public.verve_briefings (
  id                uuid primary key default gen_random_uuid(),
  titulo            text not null check (char_length(titulo) between 3 and 140),
  objetivo          text not null,
  publico_alvo      text not null,
  pilar             text not null check (pilar in ('familia','autoridade','lifestyle')),
  indicadores       jsonb not null,
  gatilho_manychat  jsonb,
  plano_semana      jsonb not null,
  -- derivados pela API a partir do plano (o ATLAS não envia e a API não confia em valor enviado):
  formato           text not null check (formato in ('reel','carrossel','story','misto')),
  quantidade_posts  int  not null check (quantidade_posts between 1 and 14),
  semana            text not null check (semana ~ '^\d{4}-W\d{2}$'),
  -- o hash cobre EXATAMENTE este texto (JSON canônico dos 7 campos de conteúdo); a aprovação do CEO fica presa a ele:
  conteudo_canonico text not null,
  content_hash      text not null unique check (content_hash ~ '^[0-9a-f]{64}$'),
  status            text not null default 'proposta' check (status in ('proposta','aprovado','recusado')),
  criado_por        text not null default 'gustavo',
  atlas_task_id     text,
  created_at        timestamptz not null default now(),
  decidido_por      uuid references auth.users(id),
  decidido_em       timestamptz,
  nota_decisao      text
);

-- O texto canônico tem que bater com o hash (confere no banco, não só na API).
create or replace function public.verve_briefings_check_hash() returns trigger language plpgsql as $$
begin
  if encode(digest(new.conteudo_canonico, 'sha256'), 'hex') <> new.content_hash then
    raise exception 'content_hash nao confere com conteudo_canonico';
  end if;
  return new;
end $$;
drop trigger if exists verve_briefings_check_hash on public.verve_briefings;
create trigger verve_briefings_check_hash before insert on public.verve_briefings
  for each row execute function public.verve_briefings_check_hash();

-- Conteúdo imutável; só proposta -> aprovado/recusado, com quem decidiu e quando; nada se apaga.
create or replace function public.verve_briefings_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'verve_briefings nao se apaga';
  end if;
  if new.id is distinct from old.id or new.titulo is distinct from old.titulo or new.objetivo is distinct from old.objetivo
     or new.publico_alvo is distinct from old.publico_alvo or new.pilar is distinct from old.pilar
     or new.indicadores is distinct from old.indicadores or new.gatilho_manychat is distinct from old.gatilho_manychat
     or new.plano_semana is distinct from old.plano_semana or new.formato is distinct from old.formato
     or new.quantidade_posts is distinct from old.quantidade_posts or new.semana is distinct from old.semana
     or new.conteudo_canonico is distinct from old.conteudo_canonico or new.content_hash is distinct from old.content_hash
     or new.criado_por is distinct from old.criado_por or new.created_at is distinct from old.created_at
     or new.atlas_task_id is distinct from old.atlas_task_id then
    raise exception 'conteudo do briefing e imutavel';
  end if;
  if old.status <> 'proposta' then
    raise exception 'briefing ja decidido';
  end if;
  if new.status not in ('aprovado','recusado') or new.decidido_por is null or new.decidido_em is null then
    raise exception 'decisao exige status aprovado/recusado, decidido_por e decidido_em';
  end if;
  return new;
end $$;
drop trigger if exists verve_briefings_guard on public.verve_briefings;
create trigger verve_briefings_guard before update or delete on public.verve_briefings
  for each row execute function public.verve_briefings_guard();

-- Uma linha por post planejado; criada pela API do VERVE quando o CEO APROVA o briefing (o ATLAS não escreve aqui).
create table if not exists public.verve_semana (
  id            uuid primary key default gen_random_uuid(),
  briefing_id   uuid not null references public.verve_briefings(id) on delete restrict,
  ordem         int  not null check (ordem >= 0),
  dia_semana    text not null check (dia_semana in ('seg','ter','qua','qui','sex','sab','dom')),
  tipo          text not null check (tipo in ('reel','carrossel','story')),
  tema          text not null,
  pilar         text not null check (pilar in ('familia','autoridade','lifestyle')),
  scheduled_at  timestamptz not null,
  status        text not null default 'planejado'
                check (status in ('planejado','rascunho','aguardando','aprovado','publicado','recusado','erro')),
  post_id       uuid,
  erro          text,
  created_at    timestamptz not null default now(),
  unique (briefing_id, ordem)
);

-- Liga o post ao briefing e registra quem autorizou a publicação.
do $$
begin
  if to_regclass('public.verve_posts') is not null then
    alter table public.verve_posts add column if not exists briefing_id uuid references public.verve_briefings(id);
    alter table public.verve_posts add column if not exists approved_by uuid;
    alter table public.verve_posts add column if not exists approved_at timestamptz;
  end if;
end $$;

-- Acesso: só a chave de serviço (API do VERVE). Nada para anon/authenticated.
alter table public.verve_briefings enable row level security;
alter table public.verve_semana    enable row level security;
revoke all on public.verve_briefings from anon, authenticated;
revoke all on public.verve_semana    from anon, authenticated;
