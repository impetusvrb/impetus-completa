-- PROMPT 25 — Industrial Workflow Engine (BPMN + state machine)
-- Aditivo, idempotente.

CREATE TABLE IF NOT EXISTS industrial_workflow_definitions (
  id UUID PRIMARY KEY,
  process_key TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  company_id UUID NULL,
  bpmn_definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  state_machine JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_iwf_def_key_version_tenant
  ON industrial_workflow_definitions (process_key, version, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TABLE IF NOT EXISTS industrial_workflow_instances (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  definition_id UUID NOT NULL REFERENCES industrial_workflow_definitions(id),
  process_key TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  current_state TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  execution_mode TEXT NOT NULL DEFAULT 'shadow',
  requested_by_user_id UUID NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iwf_inst_company_status
  ON industrial_workflow_instances (company_id, status, updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_iwf_inst_correlation
  ON industrial_workflow_instances (company_id, correlation_id);

CREATE TABLE IF NOT EXISTS industrial_workflow_execution_graph (
  id UUID PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES industrial_workflow_instances(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL,
  status TEXT NOT NULL,
  sequence_no INT NOT NULL,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exited_at TIMESTAMPTZ NULL,
  input_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_iwf_graph_instance
  ON industrial_workflow_execution_graph (instance_id, sequence_no);

CREATE TABLE IF NOT EXISTS industrial_workflow_approval_chain (
  id UUID PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES industrial_workflow_instances(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  step_index INT NOT NULL,
  node_id TEXT NOT NULL,
  required_hierarchy INT NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'pending',
  assigned_user_id UUID NULL,
  decided_by_user_id UUID NULL,
  decided_at TIMESTAMPTZ NULL,
  rejection_reason TEXT NULL,
  explainability JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iwf_approval_pending
  ON industrial_workflow_approval_chain (company_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS industrial_workflow_compensation_log (
  id UUID PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES industrial_workflow_instances(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  compensation_key TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iwf_comp_instance
  ON industrial_workflow_compensation_log (instance_id, created_at DESC);

CREATE TABLE IF NOT EXISTS industrial_workflow_audit_trail (
  id UUID PRIMARY KEY,
  instance_id UUID NOT NULL,
  company_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  from_state TEXT NULL,
  to_state TEXT NULL,
  actor_user_id UUID NULL,
  mode TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iwf_audit_instance
  ON industrial_workflow_audit_trail (instance_id, created_at DESC);
