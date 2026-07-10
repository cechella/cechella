-- Colunas novas na tabela leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS payment_token TEXT,
  ADD COLUMN IF NOT EXISTS metodo_pagamento TEXT,
  ADD COLUMN IF NOT EXISTS tentativas_pagamento INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status_pagamento TEXT;

-- Índice para busca rápida por token
CREATE UNIQUE INDEX IF NOT EXISTS leads_payment_token_idx ON leads(payment_token) WHERE payment_token IS NOT NULL;

-- Tabela de cobranças recorrentes (cartão parcelado automático)
CREATE TABLE IF NOT EXISTS pagamentos_recorrentes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       UUID,
  lead_telefone TEXT NOT NULL,
  card_token    TEXT NOT NULL,
  payment_method_id TEXT,
  issuer_id     TEXT,
  valor         NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  parcelas_pagas    INT NOT NULL DEFAULT 1,
  parcelas_total    INT NOT NULL DEFAULT 6,
  proxima_cobranca  DATE,
  status        TEXT NOT NULL DEFAULT 'ativo',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: somente service_role acessa
ALTER TABLE pagamentos_recorrentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON pagamentos_recorrentes
  USING (auth.role() = 'service_role');
