-- PROMPT 27 — Legacy deprecation governance audit
-- Aditivo, idempotente.

CREATE TABLE IF NOT EXISTS legacy_deprecation_audit (
  id UUID PRIMARY KEY,
  company_id UUID NULL,
  legacy_id TEXT NOT NULL,
  module_path TEXT NULL,
  replacement_id TEXT NULL,
  mode TEXT NOT NULL,
  caller_hint TEXT NULL,
  actor_user_id UUID NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legacy_deprecation_audit_legacy_created
  ON legacy_deprecation_audit (legacy_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legacy_deprecation_audit_company
  ON legacy_deprecation_audit (company_id, created_at DESC);
