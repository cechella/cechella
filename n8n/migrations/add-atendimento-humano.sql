-- Permite pausar a Ana e assumir conversa manualmente
-- Executado em: 2026-06-30
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS atendimento_humano BOOLEAN NOT NULL DEFAULT FALSE;
