-- PROMPT 29 — Rollout Center unified governance audit
-- Aditivo, idempotente.

CREATE TABLE IF NOT EXISTS rollout_center_audit (
  id UUID PRIMARY KEY,
  company_id UUID NULL,
  capability_id TEXT NOT NULL,
  action TEXT NOT NULL,
  mode TEXT NOT NULL,
  from_mode TEXT NULL,
  to_mode TEXT NULL,
  gate_passed BOOLEAN NOT NULL DEFAULT false,
  actor_user_id UUID NULL,
  explainability JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rollout_center_audit_capability_created
  ON rollout_center_audit (capability_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rollout_center_audit_company
  ON rollout_center_audit (company_id, created_at DESC);
