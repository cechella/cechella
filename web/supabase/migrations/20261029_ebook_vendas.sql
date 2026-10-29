-- Venda do e-book "IA para Pequenas e Médias Empresas": tabelas PRÓPRIAS, sem relação com leads, pagamentos ou produto fixo da Ana.
-- Rodar uma vez no Supabase (SQL editor). Não altera nenhuma tabela existente.
create table if not exists ebook_versoes (
  versao text primary key,
  storage_key text not null,          -- chave do arquivo no bucket privado (R2)
  sha256 text,
  ativa boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists ebook_pedidos (
  id uuid primary key default gen_random_uuid(),
  chave text not null unique,                 -- idempotência do pedido (o navegador repete a mesma chave)
  produto_slug text not null,
  versao text,
  valor_centavos integer not null,
  moeda text not null default 'BRL',
  status text not null default 'pendente' check (status in ('pendente','pago','recusado','expirado','reembolsado','contestado')),
  ambiente text not null default 'real' check (ambiente in ('real','teste')),
  email text not null,
  nome text,
  origem text,                                -- canal/conteúdo de origem
  indicacao_codigo text,                      -- código de quem indicou (opcional)
  codigo_proprio text unique,                 -- código que o comprador pode compartilhar voluntariamente
  acesso_hash text not null,                  -- sha256 do segredo do comprador (o segredo bruto nunca é guardado)
  mp_payment_id text unique,
  mp_status text,
  pix_copia_cola text,
  pix_expira_em timestamptz,
  taxa_centavos integer,                      -- null = desconhecido (não presumir zero)
  pago_em timestamptz,
  tardio boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists ebook_pedidos_status_idx on ebook_pedidos (status, criado_em);

create table if not exists ebook_eventos (
  chave text primary key,                     -- id do pagamento + estado + data: o mesmo evento nunca é aplicado duas vezes
  pedido_id uuid references ebook_pedidos(id),
  resumo text,
  criado_em timestamptz not null default now()
);

create table if not exists ebook_entregas (
  pedido_id uuid primary key references ebook_pedidos(id),   -- uma entrega por pedido
  versao text not null,
  status text not null default 'liberada' check (status in ('liberada','falhou')),
  downloads integer not null default 0,
  tentativas integer not null default 0,
  ultimo_erro text,
  liberada_em timestamptz not null default now(),
  ultimo_download_em timestamptz
);

alter table ebook_versoes enable row level security;
alter table ebook_pedidos enable row level security;
alter table ebook_eventos enable row level security;
alter table ebook_entregas enable row level security;
-- sem políticas: só a chave de serviço (rotas do servidor) lê e escreve.
