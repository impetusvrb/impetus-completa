-- PROMPT 26 — Cognitive Registry Consolidation audit trail
-- Aditivo, idempotente.

CREATE TABLE IF NOT EXISTS cognitive_registry_consolidation_audit (
  id UUID PRIMARY KEY,
  company_id UUID NULL,
  event_type TEXT NOT NULL,
  mode TEXT NOT NULL,
  actor_user_id UUID NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cog_registry_audit_company_created
  ON cognitive_registry_consolidation_audit (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cog_registry_audit_event
  ON cognitive_registry_consolidation_audit (event_type, created_at DESC);
