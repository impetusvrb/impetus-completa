-- PROMPT 31 — Certification readiness snapshots & audit
-- Aditivo, idempotente.

CREATE TABLE IF NOT EXISTS certification_readiness_snapshots (
  id UUID PRIMARY KEY,
  company_id UUID NULL,
  framework TEXT NULL,
  overall_score INT NOT NULL DEFAULT 0,
  mode TEXT NOT NULL,
  gap_count INT NOT NULL DEFAULT 0,
  report JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cert_readiness_snapshots_created
  ON certification_readiness_snapshots (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cert_readiness_snapshots_framework
  ON certification_readiness_snapshots (framework, created_at DESC);

CREATE TABLE IF NOT EXISTS certification_readiness_audit (
  id UUID PRIMARY KEY,
  company_id UUID NULL,
  action TEXT NOT NULL,
  mode TEXT NOT NULL,
  actor_user_id UUID NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cert_readiness_audit_created
  ON certification_readiness_audit (created_at DESC);
