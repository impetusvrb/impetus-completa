-- ============================================================================
-- IMPETUS — Qualidade operacional em traces de IA
-- ============================================================================

ALTER TABLE ai_interaction_traces
  ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS mode VARCHAR(24),
  ADD COLUMN IF NOT EXISTS intent VARCHAR(32),
  ADD COLUMN IF NOT EXISTS "input" TEXT,
  ADD COLUMN IF NOT EXISTS response TEXT,
  ADD COLUMN IF NOT EXISTS response_time INTEGER,
  ADD COLUMN IF NOT EXISTS tokens INTEGER,
  ADD COLUMN IF NOT EXISTS quality_score NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS user_feedback TEXT,
  ADD COLUMN IF NOT EXISTS failure_flag BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS correction_needed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN ai_interaction_traces.timestamp IS
  'Timestamp canónico da interação para dashboards operacionais.';

COMMENT ON COLUMN ai_interaction_traces.mode IS
  'Canal/modo de execução da IA (text, assistant, voice).';

COMMENT ON COLUMN ai_interaction_traces.intent IS
  'Intenção detectada para o input do utilizador.';

COMMENT ON COLUMN ai_interaction_traces.input IS
  'Texto bruto de entrada (com truncamento/redação aplicada).';

COMMENT ON COLUMN ai_interaction_traces.response IS
  'Resposta textual final da IA (com truncamento/redação aplicada).';

COMMENT ON COLUMN ai_interaction_traces.response_time IS
  'Tempo de resposta em milissegundos.';

COMMENT ON COLUMN ai_interaction_traces.tokens IS
  'Estimativa de tokens consumidos na interação.';

COMMENT ON COLUMN ai_interaction_traces.quality_score IS
  'Score de qualidade da resposta IA (0-10), gerado por auto-avaliação.';

COMMENT ON COLUMN ai_interaction_traces.user_feedback IS
  'Feedback textual curto da avaliação automática ou do usuário.';

COMMENT ON COLUMN ai_interaction_traces.failure_flag IS
  'Marca falha operacional detectada (ex.: quality_score < 6).';

COMMENT ON COLUMN ai_interaction_traces.correction_needed IS
  'Indica se a resposta precisa correção/reprocessamento.';

CREATE INDEX IF NOT EXISTS idx_ai_interaction_traces_quality
  ON ai_interaction_traces (company_id, failure_flag, quality_score, created_at DESC);
