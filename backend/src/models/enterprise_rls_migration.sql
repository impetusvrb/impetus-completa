-- PROMPT 18 — PostgreSQL RLS + Multi-tenant Hardening (defense-in-depth)

CREATE TABLE IF NOT EXISTS tenant_rls_registry (
  table_name TEXT PRIMARY KEY,
  tenant_column TEXT NOT NULL DEFAULT 'company_id',
  enabled BOOLEAN NOT NULL DEFAULT false,
  policy_applied BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_rls_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL,
  event TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'ok',
  table_name TEXT,
  tenant_expected UUID,
  tenant_attempted UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_rls_audit_created
  ON tenant_rls_audit_events (created_at DESC);

-- Session helpers (SECURITY DEFINER safe comparators)
CREATE OR REPLACE FUNCTION impetus_current_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_company_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION impetus_rls_bypass_active()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('app.bypass_rls', true), '') = 'true';
$$;

CREATE OR REPLACE FUNCTION impetus_tenant_row_visible(row_tenant UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    impetus_rls_bypass_active()
    OR impetus_current_company_id() IS NULL
    OR row_tenant IS NULL
    OR row_tenant = impetus_current_company_id();
$$;

-- Seed registry (additive catalog — ENABLE per table via runtime)
INSERT INTO tenant_rls_registry (table_name, tenant_column, enabled, notes)
VALUES
  ('users', 'company_id', false, 'core identity'),
  ('ai_interaction_traces', 'company_id', false, 'AI audit'),
  ('ai_hallucination_assessments', 'company_id', false, 'hallucination V1'),
  ('sz4_operational_persistence_records', 'tenant_id', false, 'SZ4 persistence — column tenant_id'),
  ('z_conversation_message_index', 'tenant_id', false, 'SZ5 index'),
  ('tenant_federation_providers', 'company_id', false, 'federation config'),
  ('federation_identity_links', 'company_id', false, 'federation links'),
  ('federation_login_traces', 'company_id', false, 'federation traces'),
  ('tenant_mfa_policies', 'company_id', false, 'MFA policy'),
  ('user_mfa_enrollments', 'company_id', false, 'MFA enroll'),
  ('mfa_audit_events', 'company_id', false, 'MFA audit'),
  ('mfa_challenges', 'company_id', false, 'MFA challenges')
ON CONFLICT (table_name) DO NOTHING;
