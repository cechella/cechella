-- Adiciona coluna role em training_modules para separar conteúdo por área
ALTER TABLE training_modules
  ADD COLUMN IF NOT EXISTS role text DEFAULT 'medical'
    CHECK (role IN ('medical', 'sales'));

-- Módulos existentes (sem role) são do médico
UPDATE training_modules SET role = 'medical' WHERE role IS NULL;

-- Índice para filtro por role
CREATE INDEX IF NOT EXISTS idx_training_modules_role ON training_modules(role);
