-- Migration: Simulation Turns & Memories
-- Extends ana_simulacoes + creates ana_simulation_turns + ana_simulation_memories

-- ── Extend ana_simulacoes ─────────────────────────────────────────────────────
ALTER TABLE ana_simulacoes
  ADD COLUMN IF NOT EXISTS simulation_type       text    DEFAULT 'candidata',
  ADD COLUMN IF NOT EXISTS consultant            text,
  ADD COLUMN IF NOT EXISTS lead_name             text,
  ADD COLUMN IF NOT EXISTS lead_origin           text,
  ADD COLUMN IF NOT EXISTS referrer_name         text,
  ADD COLUMN IF NOT EXISTS dna_version           text    DEFAULT 'v1',
  ADD COLUMN IF NOT EXISTS gold_reference        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS immutable_reference   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reference_simulation_id uuid   REFERENCES ana_simulacoes(id);

-- ── Behavioral turns ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ana_simulation_turns (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id   uuid        NOT NULL REFERENCES ana_simulacoes(id) ON DELETE CASCADE,
  turn_number     integer     NOT NULL,
  stage           text,
  speaker         text        NOT NULL,           -- 'ANA' | 'LEAD' | 'DR'
  content         text        NOT NULL,
  text_source     text        DEFAULT 'RECONSTRUCTED',  -- RECONSTRUCTED | SEMANTIC_SUMMARY | LITERAL
  behavioral_intent text,
  gold_moment     boolean     DEFAULT false,
  gold_marker     text,
  creates_memory  text,                            -- memory_key created here
  consumes_memory text,                            -- memory_key consumed here
  gate_passed     text,
  created_at      timestamptz DEFAULT now()
);

-- ── Memory map ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ana_simulation_memories (
  id                  uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id       uuid        NOT NULL REFERENCES ana_simulacoes(id) ON DELETE CASCADE,
  memory_key          text        NOT NULL,
  fact_captured       text        NOT NULL,
  origin_stage        text,
  reused_stage        text,
  commercial_function text,
  created_at          timestamptz DEFAULT now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sim_turns_sim     ON ana_simulation_turns(simulation_id);
CREATE INDEX IF NOT EXISTS idx_sim_turns_order   ON ana_simulation_turns(simulation_id, turn_number);
CREATE INDEX IF NOT EXISTS idx_sim_memories_sim  ON ana_simulation_memories(simulation_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE ana_simulation_turns    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ana_simulation_memories ENABLE ROW LEVEL SECURITY;
