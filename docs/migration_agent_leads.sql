-- Migração: adicionar colunas do agente de vendas na tabela leads
-- Execute no Supabase Dashboard → SQL Editor

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS etapa INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS temperatura TEXT DEFAULT 'morno',
  ADD COLUMN IF NOT EXISTS dor_principal TEXT,
  ADD COLUMN IF NOT EXISTS contexto TEXT,
  ADD COLUMN IF NOT EXISTS historico JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS origem_agente TEXT DEFAULT 'whatsapp';

-- Remover constraint UNIQUE de email (WhatsApp leads não têm email)
ALTER TABLE leads ALTER COLUMN email DROP NOT NULL;
ALTER TABLE leads ALTER COLUMN nome DROP NOT NULL;

-- Index para busca por telefone
CREATE INDEX IF NOT EXISTS leads_telefone_idx ON leads(telefone);

-- Liberar acesso para o service_role (n8n usa service_role key)
CREATE POLICY IF NOT EXISTS "Service role acesso total leads" ON leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);
