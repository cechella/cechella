-- ============================================
-- CRM: Atualização da tabela leads
-- ============================================
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS etapa TEXT DEFAULT 'site' CHECK (etapa IN ('instagram', 'site', 'whatsapp', 'apresentacao', 'conexao', 'di', 'speech', 'fechamento', 'ganho', 'perdido')),
  ADD COLUMN IF NOT EXISTS temperatura TEXT DEFAULT 'frio' CHECK (temperatura IN ('quente', 'morno', 'frio')),
  ADD COLUMN IF NOT EXISTS ultimo_contato TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notas TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- ============================================
-- Conversas WhatsApp
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  telefone TEXT NOT NULL,
  nome TEXT,
  etapa TEXT DEFAULT 'inicio' CHECK (etapa IN ('inicio', 'apresentacao', 'conexao', 'di', 'speech', 'fechamento', 'ganho', 'perdido')),
  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'encerrado')),
  referidos_coletados INTEGER DEFAULT 0,
  iniciado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin vê todas conversas" ON whatsapp_conversations
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'sales'))
  );

-- ============================================
-- Mensagens WhatsApp
-- ============================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  direcao TEXT NOT NULL CHECK (direcao IN ('entrada', 'saida')),
  conteudo TEXT NOT NULL,
  tipo TEXT DEFAULT 'texto' CHECK (tipo IN ('texto', 'imagem', 'audio', 'documento')),
  enviado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin vê todas mensagens" ON whatsapp_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'sales'))
  );

-- ============================================
-- Índices
-- ============================================
CREATE INDEX IF NOT EXISTS idx_leads_etapa ON leads(etapa);
CREATE INDEX IF NOT EXISTS idx_leads_temperatura ON leads(temperatura);
CREATE INDEX IF NOT EXISTS idx_conversations_lead ON whatsapp_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON whatsapp_messages(conversation_id);
