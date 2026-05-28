-- PROMPT 32 — Final consolidation audit snapshots & audit
-- Aditivo, idempotente.

CREATE TABLE IF NOT EXISTS final_consolidation_snapshots (
  id UUID PRIMARY KEY,
  company_id UUID NULL,
  classification TEXT NOT NULL DEFAULT 'unknown',
  overall_score INT NOT NULL DEFAULT 0,
  maturity_score INT NOT NULL DEFAULT 0,
  mode TEXT NOT NULL,
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_final_consolidation_snapshots_created
  ON final_consolidation_snapshots (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_final_consolidation_snapshots_classification
  ON final_consolidation_snapshots (classification, created_at DESC);

CREATE TABLE IF NOT EXISTS final_consolidation_audit (
  id UUID PRIMARY KEY,
  company_id UUID NULL,
  action TEXT NOT NULL,
  mode TEXT NOT NULL,
  actor_user_id UUID NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_final_consolidation_audit_created
  ON final_consolidation_audit (created_at DESC);
