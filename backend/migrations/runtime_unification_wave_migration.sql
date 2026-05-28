-- PROMPT 28 — Runtime unification (SZ5) audit trail
-- Aditivo, idempotente.

CREATE TABLE IF NOT EXISTS runtime_unification_audit (
  id UUID PRIMARY KEY,
  company_id UUID NULL,
  channel TEXT NOT NULL,
  mode TEXT NOT NULL,
  source TEXT NOT NULL,
  sz5_fact_count INT NOT NULL DEFAULT 0,
  legacy_block_chars INT NOT NULL DEFAULT 0,
  unified_block_chars INT NOT NULL DEFAULT 0,
  shadow_divergence BOOLEAN NOT NULL DEFAULT false,
  caller_hint TEXT NULL,
  actor_user_id UUID NULL,
  explainability JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_runtime_unification_audit_channel_created
  ON runtime_unification_audit (channel, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_unification_audit_company
  ON runtime_unification_audit (company_id, created_at DESC);
