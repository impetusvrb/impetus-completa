-- ============================================================
-- SAFETY & ENVIRONMENT GOVERNANCE GATE — Migration
-- Requisitos: Policy Engine + HITL Approval + Audit Immutable
-- Rollback: DROP TABLE IF EXISTS domain_policy_rules, domain_publication_approvals;
-- ============================================================

-- 1. Policy rules (versionadas, determinísticas, por domínio/tenant)
CREATE TABLE IF NOT EXISTS domain_policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  domain VARCHAR(32) NOT NULL CHECK (domain IN ('safety', 'environment')),
  policy_id VARCHAR(128) NOT NULL,
  version VARCHAR(16) NOT NULL,
  rule_body JSONB NOT NULL,
  severity VARCHAR(16) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  requires_human_approval BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  retired_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, domain, policy_id, version)
);

CREATE INDEX IF NOT EXISTS idx_domain_policy_rules_active
  ON domain_policy_rules(company_id, domain, effective_from)
  WHERE retired_at IS NULL;

-- 2. Publication approval queue (HITL formal)
CREATE TABLE IF NOT EXISTS domain_publication_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  domain VARCHAR(32) NOT NULL CHECK (domain IN ('safety', 'environment')),
  action_type VARCHAR(64) NOT NULL,
  requested_by_user_id UUID NOT NULL,
  responsible_engineer_id UUID,
  status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  policy_evaluation JSONB,
  context_payload JSONB,
  approved_by_user_id UUID,
  approved_at TIMESTAMPTZ,
  rejected_by_user_id UUID,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '72 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_domain_pub_approvals_pending
  ON domain_publication_approvals(company_id, domain, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_domain_pub_approvals_engineer
  ON domain_publication_approvals(responsible_engineer_id, status);

-- 3. Ensure industrial_audit_events exists (idempotent with wave7)
CREATE TABLE IF NOT EXISTS industrial_audit_events (
  id VARCHAR(64) PRIMARY KEY,
  event_type VARCHAR(128) NOT NULL,
  domain VARCHAR(32) NOT NULL,
  workflow_id VARCHAR(64),
  actor_id VARCHAR(64),
  actor_role VARCHAR(64),
  company_id UUID,
  traceability_id VARCHAR(128),
  payload JSONB,
  severity VARCHAR(16) DEFAULT 'info',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_industrial_audit_events_company
  ON industrial_audit_events(company_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_industrial_audit_events_domain
  ON industrial_audit_events(domain, recorded_at DESC);
