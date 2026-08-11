-- ANA MASTER M1 — Core tables
-- Run in Supabase SQL editor (same project as web/)

CREATE TABLE IF NOT EXISTS ana_calls (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  call_sid     text        NOT NULL UNIQUE,
  telefone     text        NOT NULL,
  stage        text        NOT NULL DEFAULT 'apresentacao',
  status       text        NOT NULL DEFAULT 'active'
               CHECK (status IN ('active', 'ganho', 'perdido', 'encerrado')),
  gates_passed text[]      NOT NULL DEFAULT '{}',
  memories     jsonb       NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ana_calls_telefone ON ana_calls(telefone);
CREATE INDEX IF NOT EXISTS idx_ana_calls_status   ON ana_calls(status);
CREATE INDEX IF NOT EXISTS idx_ana_calls_stage    ON ana_calls(stage);

CREATE TABLE IF NOT EXISTS ana_memories (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  call_sid    text        NOT NULL,
  memory_key  text        NOT NULL,
  value       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (call_sid, memory_key)
);

CREATE INDEX IF NOT EXISTS idx_ana_memories_call ON ana_memories(call_sid);

ALTER TABLE ana_calls    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ana_memories ENABLE ROW LEVEL SECURITY;

-- Service role (used by Fastify with SUPABASE_SERVICE_ROLE_KEY) has full access
CREATE POLICY IF NOT EXISTS "service_full_ana_calls"
  ON ana_calls FOR ALL USING (true);

CREATE POLICY IF NOT EXISTS "service_full_ana_memories"
  ON ana_memories FOR ALL USING (true);
