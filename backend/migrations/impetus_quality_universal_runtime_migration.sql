-- =============================================================================
-- IMPETUS — Quality Universal Industrial Runtime (dual-layer)
-- Aditivo, idempotente. Sem ALTER em tabelas legadas.
-- Feature flag: IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED (aplicação)
-- =============================================================================

CREATE TABLE IF NOT EXISTS impetus_quality_tenant_config (
  company_id UUID PRIMARY KEY,
  industry_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  ui_density JSONB NOT NULL DEFAULT '{}'::jsonb,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS impetus_quality_role_runtime_map (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  role_key TEXT NOT NULL,
  origin_layer TEXT NOT NULL CHECK (origin_layer IN ('operational', 'governance', 'both')),
  intended_audience TEXT NOT NULL DEFAULT 'operator',
  functional_area TEXT NULL,
  cognitive_budget_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, role_key)
);

CREATE INDEX IF NOT EXISTS idx_impetus_q_role_map_company
  ON impetus_quality_role_runtime_map (company_id, active);

CREATE TABLE IF NOT EXISTS impetus_quality_field_catalog (
  id UUID PRIMARY KEY,
  company_id UUID NULL,
  schema_key TEXT NOT NULL,
  json_schema JSONB NOT NULL,
  version INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_impetus_q_field_platform_ver
  ON impetus_quality_field_catalog (schema_key, version)
  WHERE company_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_impetus_q_field_tenant_ver
  ON impetus_quality_field_catalog (company_id, schema_key, version)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_impetus_q_field_catalog_company
  ON impetus_quality_field_catalog (company_id, active);

CREATE TABLE IF NOT EXISTS impetus_quality_workflow_definition (
  id UUID PRIMARY KEY,
  company_id UUID NULL,
  workflow_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_impetus_q_wf_def_platform_key
  ON impetus_quality_workflow_definition (workflow_key)
  WHERE company_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_impetus_q_wf_def_tenant_key
  ON impetus_quality_workflow_definition (company_id, workflow_key)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_impetus_q_wf_def_company
  ON impetus_quality_workflow_definition (company_id, active, kind);

CREATE TABLE IF NOT EXISTS impetus_quality_workflow_instance (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  workflow_def_id UUID NOT NULL REFERENCES impetus_quality_workflow_definition (id),
  current_state TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id TEXT NOT NULL,
  trace_id TEXT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_impetus_q_wf_inst_company
  ON impetus_quality_workflow_instance (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS impetus_quality_audit_chain (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_ref TEXT NULL,
  correlation_id TEXT NULL,
  causation_id TEXT NULL,
  workflow_id TEXT NULL,
  origin_layer TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_hash TEXT NOT NULL,
  prev_hash TEXT NULL,
  row_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_impetus_q_audit_company_time
  ON impetus_quality_audit_chain (company_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Immutability: append-only (quando a tabela existir)
-- ---------------------------------------------------------------------------
DO $impetus_q_audit$
BEGIN
  CREATE OR REPLACE FUNCTION impetus_quality_audit_block_mutation()
  RETURNS trigger
  LANGUAGE plpgsql
  AS $fn$
  BEGIN
    RAISE EXCEPTION 'IMPETUS_QUALITY_AUDIT_IMMUTABLE: % rejeitada em %', TG_OP, TG_TABLE_NAME
      USING ERRCODE = 'P0001';
  END;
  $fn$;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'impetus_quality_audit_chain'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_immutable_impetus_q_audit_upd ON impetus_quality_audit_chain';
    EXECUTE 'DROP TRIGGER IF EXISTS trg_immutable_impetus_q_audit_del ON impetus_quality_audit_chain';
    EXECUTE 'CREATE TRIGGER trg_immutable_impetus_q_audit_upd
             BEFORE UPDATE ON impetus_quality_audit_chain
             FOR EACH ROW EXECUTE FUNCTION impetus_quality_audit_block_mutation()';
    EXECUTE 'CREATE TRIGGER trg_immutable_impetus_q_audit_del
             BEFORE DELETE ON impetus_quality_audit_chain
             FOR EACH ROW EXECUTE FUNCTION impetus_quality_audit_block_mutation()';
  END IF;
END;
$impetus_q_audit$;

-- ---------------------------------------------------------------------------
-- Plantas declarativas (company_id NULL = kernel partilhado / fallback)
-- Parametrizáveis por tenant via INSERT com mesmo workflow_key e company_id set.
-- ---------------------------------------------------------------------------
INSERT INTO impetus_quality_workflow_definition (id, company_id, workflow_key, kind, definition, active)
VALUES
  (
    'a1000000-0000-4000-8000-000000000001'::uuid,
    NULL,
    'ncr_universal',
    'ncr',
    '{
      "schema_version": 1,
      "initial_state": "opened",
      "states": {
        "opened": { "transitions": { "submit": "under_review", "cancel": "closed" } },
        "under_review": { "transitions": { "approve": "disposition_pending", "reject": "opened" } },
        "disposition_pending": { "transitions": { "dispose": "closed", "escalate": "escalated" } },
        "escalated": { "transitions": { "resolve": "closed" } },
        "closed": { "transitions": {} }
      },
      "events": {
        "submit": "quality.ncr.opened",
        "approve": "quality.workflow.transition",
        "dispose": "quality.ncr.closed",
        "escalate": "quality.risk.escalated"
      }
    }'::jsonb,
    true
  ),
  (
    'a1000000-0000-4000-8000-000000000002'::uuid,
    NULL,
    'capa_universal',
    'capa',
    '{
      "schema_version": 1,
      "initial_state": "draft",
      "states": {
        "draft": { "transitions": { "submit": "in_progress" } },
        "in_progress": { "transitions": { "verify": "closed", "extend": "in_progress" } },
        "closed": { "transitions": {} }
      },
      "events": {
        "submit": "quality.capa.created",
        "verify": "quality.capa.verified",
        "extend": "quality.capa.extended"
      }
    }'::jsonb,
    true
  ),
  (
    'a1000000-0000-4000-8000-000000000003'::uuid,
    NULL,
    'pdca_universal',
    'pdca',
    '{
      "schema_version": 1,
      "initial_state": "plan",
      "states": {
        "plan": { "transitions": { "advance": "do" } },
        "do": { "transitions": { "advance": "check" } },
        "check": { "transitions": { "advance": "act" } },
        "act": { "transitions": { "advance": "plan", "close": "closed" } },
        "closed": { "transitions": {} }
      },
      "events": {
        "advance": "quality.pdca.phase_advanced",
        "close": "quality.pdca.closed"
      }
    }'::jsonb,
    true
  ),
  (
    'a1000000-0000-4000-8000-000000000004'::uuid,
    NULL,
    'approval_universal',
    'approval',
    '{
      "schema_version": 1,
      "initial_state": "pending",
      "states": {
        "pending": { "transitions": { "approve": "approved", "reject": "rejected" } },
        "approved": { "transitions": {} },
        "rejected": { "transitions": { "resubmit": "pending" } }
      },
      "events": {
        "approve": "quality.workflow.approved",
        "reject": "quality.workflow.rejected",
        "resubmit": "quality.workflow.resubmitted"
      }
    }'::jsonb,
    true
  ),
  (
    'a1000000-0000-4000-8000-000000000005'::uuid,
    NULL,
    'escalation_universal',
    'escalation',
    '{
      "schema_version": 1,
      "initial_state": "level_1",
      "states": {
        "level_1": { "transitions": { "escalate": "level_2" } },
        "level_2": { "transitions": { "escalate": "level_3", "ack": "acknowledged" } },
        "level_3": { "transitions": { "ack": "acknowledged" } },
        "acknowledged": { "transitions": {} }
      },
      "events": {
        "escalate": "quality.risk.escalated",
        "ack": "quality.risk.acknowledged"
      }
    }'::jsonb,
    true
  )
ON CONFLICT (id) DO NOTHING;
