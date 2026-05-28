-- PROMPT 30 — Enterprise locale / timezone / i18n audit
-- Aditivo, idempotente.

CREATE TABLE IF NOT EXISTS enterprise_locale_audit (
  id UUID PRIMARY KEY,
  company_id UUID NULL,
  user_id UUID NULL,
  action TEXT NOT NULL,
  mode TEXT NOT NULL,
  locale TEXT NULL,
  timezone TEXT NULL,
  region_code TEXT NULL,
  currency TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_locale_audit_company
  ON enterprise_locale_audit (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enterprise_locale_audit_user
  ON enterprise_locale_audit (user_id, created_at DESC);
