-- Constraint UNIQUE para evitar duplicatas ao salvar contatos referidos
-- Executado em: 2026-06-30
ALTER TABLE contatos_referidos
ADD CONSTRAINT unique_referido_telefone
UNIQUE (indicado_por_telefone, telefone);
