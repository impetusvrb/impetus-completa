-- =============================================================================
-- GF-016 — Ishikawa Core Domain (Root Cause Investigation SSOT)
-- Aditivo, idempotente. Sem alteração a tabelas homologadas Quality/PPAP/MSA.
-- =============================================================================

-- Aggregate root: RootCauseInvestigation
CREATE TABLE IF NOT EXISTS ishikawa_root_cause_investigations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  investigation_number TEXT NOT NULL,
  title TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  effect_description TEXT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'UNDER_INVESTIGATION', 'ROOT_CAUSE_DEFINED', 'ACTIONS_DEFINED',
    'UNDER_APPROVAL', 'APPROVED', 'REJECTED', 'CLOSED', 'ARCHIVED'
  )),
  workflow_stage TEXT NOT NULL DEFAULT 'DRAFT' CHECK (workflow_stage IN (
    'DRAFT', 'INVESTIGATION', 'ROOT_CAUSE_DEFINITION', 'ACTION_PLANNING',
    'APPROVAL', 'CLOSURE', 'ARCHIVE'
  )),
  root_cause_summary TEXT NULL,
  rejection_reason TEXT NULL,
  notes TEXT NULL,
  started_at TIMESTAMPTZ NULL,
  root_cause_defined_at TIMESTAMPTZ NULL,
  actions_defined_at TIMESTAMPTZ NULL,
  submitted_for_approval_at TIMESTAMPTZ NULL,
  approved_at TIMESTAMPTZ NULL,
  rejected_at TIMESTAMPTZ NULL,
  closed_at TIMESTAMPTZ NULL,
  archived_at TIMESTAMPTZ NULL,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  -- Integração futura (GF-017+) — nullable, sem consumo nesta GF
  quality_inspection_id UUID NULL,
  ncr_workflow_instance_id UUID NULL,
  capa_workflow_instance_id UUID NULL,
  ppap_submission_id UUID NULL,
  msa_study_id UUID NULL,
  supplier_ref TEXT NULL,
  part_ref TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, investigation_number)
);

CREATE INDEX IF NOT EXISTS idx_ish_investigations_company ON ishikawa_root_cause_investigations(company_id);
CREATE INDEX IF NOT EXISTS idx_ish_investigations_status ON ishikawa_root_cause_investigations(company_id, status);

-- Investigation team
CREATE TABLE IF NOT EXISTS ishikawa_investigation_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES ishikawa_root_cause_investigations(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_role TEXT NOT NULL,
  user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  is_lead BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investigation_id, member_name, member_role)
);

CREATE INDEX IF NOT EXISTS idx_ish_team_investigation ON ishikawa_investigation_team(investigation_id);

-- Evidence
CREATE TABLE IF NOT EXISTS ishikawa_investigation_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES ishikawa_root_cause_investigations(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL,
  description TEXT NOT NULL,
  source_ref TEXT NULL,
  collected_at TIMESTAMPTZ NULL,
  collected_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ish_evidence_investigation ON ishikawa_investigation_evidence(investigation_id);

-- Fishbone diagram (1:1 per investigation)
CREATE TABLE IF NOT EXISTS ishikawa_fishbone_diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES ishikawa_root_cause_investigations(id) ON DELETE CASCADE,
  effect_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (investigation_id)
);

CREATE INDEX IF NOT EXISTS idx_ish_fishbone_investigation ON ishikawa_fishbone_diagrams(investigation_id);

-- Fishbone categories (6M fixed)
CREATE TABLE IF NOT EXISTS ishikawa_fishbone_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  diagram_id UUID NOT NULL REFERENCES ishikawa_fishbone_diagrams(id) ON DELETE CASCADE,
  category_key TEXT NOT NULL CHECK (category_key IN (
    'MAN', 'MACHINE', 'METHOD', 'MATERIAL', 'MEASUREMENT', 'MOTHER_NATURE'
  )),
  label TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (diagram_id, category_key)
);

CREATE INDEX IF NOT EXISTS idx_ish_fishbone_cat_diagram ON ishikawa_fishbone_categories(diagram_id);

-- Fishbone causes
CREATE TABLE IF NOT EXISTS ishikawa_fishbone_causes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES ishikawa_fishbone_categories(id) ON DELETE CASCADE,
  cause_text TEXT NOT NULL,
  is_root_candidate BOOLEAN NOT NULL DEFAULT false,
  severity TEXT NULL CHECK (severity IS NULL OR severity IN ('low', 'medium', 'high', 'critical')),
  evidence_ref TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ish_fishbone_causes_category ON ishikawa_fishbone_causes(category_id);

-- Five Why analysis
CREATE TABLE IF NOT EXISTS ishikawa_five_why_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES ishikawa_root_cause_investigations(id) ON DELETE CASCADE,
  fishbone_cause_id UUID NULL REFERENCES ishikawa_fishbone_causes(id) ON DELETE SET NULL,
  root_hypothesis TEXT NULL,
  depth INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ish_five_why_investigation ON ishikawa_five_why_analyses(investigation_id);

CREATE TABLE IF NOT EXISTS ishikawa_five_why_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES ishikawa_five_why_analyses(id) ON DELETE CASCADE,
  step_number INT NOT NULL CHECK (step_number >= 1 AND step_number <= 10),
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, step_number)
);

CREATE INDEX IF NOT EXISTS idx_ish_five_why_steps_analysis ON ishikawa_five_why_steps(analysis_id);

-- Corrective actions
CREATE TABLE IF NOT EXISTS ishikawa_corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES ishikawa_root_cause_investigations(id) ON DELETE CASCADE,
  action_title TEXT NOT NULL,
  action_description TEXT NOT NULL,
  responsible_name TEXT NULL,
  due_date DATE NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ish_corrective_investigation ON ishikawa_corrective_actions(investigation_id);

-- Preventive actions
CREATE TABLE IF NOT EXISTS ishikawa_preventive_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES ishikawa_root_cause_investigations(id) ON DELETE CASCADE,
  action_title TEXT NOT NULL,
  action_description TEXT NOT NULL,
  responsible_name TEXT NULL,
  due_date DATE NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ish_preventive_investigation ON ishikawa_preventive_actions(investigation_id);

-- Verification results
CREATE TABLE IF NOT EXISTS ishikawa_verification_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES ishikawa_root_cause_investigations(id) ON DELETE CASCADE,
  verification_method TEXT NOT NULL,
  result_summary TEXT NOT NULL,
  effective BOOLEAN NULL,
  verified_at TIMESTAMPTZ NULL,
  verified_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ish_verification_investigation ON ishikawa_verification_results(investigation_id);

-- Approvals
CREATE TABLE IF NOT EXISTS ishikawa_investigation_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES ishikawa_root_cause_investigations(id) ON DELETE CASCADE,
  approver_name TEXT NOT NULL,
  approver_role TEXT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('pending', 'approved', 'rejected')),
  comments TEXT NULL,
  decided_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ish_approvals_investigation ON ishikawa_investigation_approvals(investigation_id);

-- Attached documents
CREATE TABLE IF NOT EXISTS ishikawa_attached_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES ishikawa_root_cause_investigations(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_ref TEXT NOT NULL,
  mime_type TEXT NULL,
  uploaded_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ish_documents_investigation ON ishikawa_attached_documents(investigation_id);

-- Workflow history (immutable audit)
CREATE TABLE IF NOT EXISTS ishikawa_investigation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  investigation_id UUID NOT NULL REFERENCES ishikawa_root_cause_investigations(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  from_workflow_stage TEXT NOT NULL,
  to_workflow_stage TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ish_history_investigation ON ishikawa_investigation_history(investigation_id, created_at DESC);
