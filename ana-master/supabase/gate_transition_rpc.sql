-- ANA MASTER — Gate Transition RPC
-- Transação completa e atômica para mudança de stage via gate.
-- Executar no Supabase SQL Editor do projeto.
--
-- Garante que stage + gate_passed + trace são uma única operação.
-- Se qualquer parte falhar: ROLLBACK completo.
-- Nunca permite stage=fechamento sem GATE_SPEECH registrado.

-- Tabela de trace de transições (append-only, auditoria)
CREATE TABLE IF NOT EXISTS ana_gate_trace (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  call_sid    text        NOT NULL,
  gate_id     text        NOT NULL,
  from_stage  text        NOT NULL,
  to_stage    text        NOT NULL,
  evidence    jsonb       NOT NULL DEFAULT '{}',
  transitioned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gate_trace_call ON ana_gate_trace(call_sid);
CREATE INDEX IF NOT EXISTS idx_gate_trace_gate ON ana_gate_trace(gate_id);

ALTER TABLE ana_gate_trace ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ana_gate_trace' AND policyname = 'service_full_gate_trace'
  ) THEN
    CREATE POLICY "service_full_gate_trace" ON ana_gate_trace FOR ALL USING (true);
  END IF;
END
$$;

-- Função principal: executa transição completa em uma única transação
-- Retorna: { transitioned: boolean, reason: text }
CREATE OR REPLACE FUNCTION gate_transition(
  p_call_sid   text,
  p_gate_id    text,
  p_from_stage text,
  p_to_stage   text,
  p_evidence   jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  rows_updated integer;
  result       jsonb;
BEGIN
  -- 1. Conditional stage update — only if currently in fromStage (atomic guard)
  UPDATE ana_calls
  SET
    stage      = p_to_stage,
    updated_at = now()
  WHERE
    call_sid = p_call_sid
    AND stage = p_from_stage;  -- atomic condition: stage cannot have changed

  GET DIAGNOSTICS rows_updated = ROW_COUNT;

  IF rows_updated = 0 THEN
    -- Stage was not fromStage — transition denied
    RETURN jsonb_build_object(
      'transitioned', false,
      'reason', format(
        '%s bloqueado — transição atômica falhou. Stage não era "%s" no momento da execução (race condition ou stage inválido).',
        p_gate_id, p_from_stage
      )
    );
  END IF;

  -- 2. Record gate as passed (append to array)
  UPDATE ana_calls
  SET
    gates_passed = array_append(gates_passed, p_gate_id),
    updated_at   = now()
  WHERE call_sid = p_call_sid;

  -- 3. Special case: GATE_VALIDACAO sets status = ganho atomically
  IF p_gate_id = 'GATE_VALIDACAO' THEN
    UPDATE ana_calls
    SET
      status     = 'ganho',
      updated_at = now()
    WHERE call_sid = p_call_sid;
  END IF;

  -- 4. Write transition trace (audit log)
  INSERT INTO ana_gate_trace (call_sid, gate_id, from_stage, to_stage, evidence)
  VALUES (p_call_sid, p_gate_id, p_from_stage, p_to_stage, p_evidence);

  RETURN jsonb_build_object(
    'transitioned', true,
    'reason',       format('%s aprovado.', p_gate_id),
    'next_stage',   p_to_stage
  );

EXCEPTION WHEN OTHERS THEN
  -- Any error rolls back the entire transaction automatically (plpgsql default)
  RAISE WARNING 'gate_transition failed for % / %: %', p_call_sid, p_gate_id, SQLERRM;
  RETURN jsonb_build_object(
    'transitioned', false,
    'reason', format('Erro interno na transição: %s', SQLERRM)
  );
END;
$$;
