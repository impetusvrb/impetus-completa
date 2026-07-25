-- =============================================================================
-- GF-009 — MSA Core Domain (AIAG MSA 4th Ed. canonical model)
-- Aditivo, idempotente. Sem alteração a tabelas homologadas Quality/PPAP.
-- =============================================================================

-- Peças / amostras de referência
CREATE TABLE IF NOT EXISTS msa_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  part_number TEXT NOT NULL,
  part_name TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT 'A',
  nominal_value NUMERIC(14,6) NULL,
  unit TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, part_number, revision)
);

CREATE INDEX IF NOT EXISTS idx_msa_parts_company ON msa_parts(company_id);

-- Instrumentos de medição (Gauge registry)
CREATE TABLE IF NOT EXISTS msa_gauges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  gauge_code TEXT NOT NULL,
  gauge_name TEXT NOT NULL,
  gauge_type TEXT NOT NULL,
  resolution NUMERIC(14,6) NULL,
  measurement_unit TEXT NULL,
  calibration_due_date DATE NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, gauge_code)
);

CREATE INDEX IF NOT EXISTS idx_msa_gauges_company ON msa_gauges(company_id);

-- Equipamento físico (Instrument)
CREATE TABLE IF NOT EXISTS msa_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  instrument_code TEXT NOT NULL,
  serial_number TEXT NULL,
  gauge_id UUID NULL REFERENCES msa_gauges(id) ON DELETE SET NULL,
  manufacturer TEXT NULL,
  model TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, instrument_code)
);

CREATE INDEX IF NOT EXISTS idx_msa_instruments_company ON msa_instruments(company_id);
CREATE INDEX IF NOT EXISTS idx_msa_instruments_gauge ON msa_instruments(company_id, gauge_id);

-- Operadores / appraisers
CREATE TABLE IF NOT EXISTS msa_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  operator_code TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, operator_code)
);

CREATE INDEX IF NOT EXISTS idx_msa_operators_company ON msa_operators(company_id);

-- Referências de calibração
CREATE TABLE IF NOT EXISTS msa_calibration_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reference_code TEXT NOT NULL,
  reference_name TEXT NOT NULL,
  nominal_value NUMERIC(14,6) NULL,
  uncertainty NUMERIC(14,6) NULL,
  unit TEXT NULL,
  certificate_number TEXT NULL,
  valid_until DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, reference_code)
);

CREATE INDEX IF NOT EXISTS idx_msa_calibration_refs_company ON msa_calibration_references(company_id);

-- Estudo principal (MeasurementStudy aggregate root)
CREATE TABLE IF NOT EXISTS msa_measurement_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  study_number TEXT NOT NULL,
  study_title TEXT NOT NULL,
  characteristic_name TEXT NOT NULL,
  measurement_unit TEXT NULL,
  gauge_id UUID NULL REFERENCES msa_gauges(id) ON DELETE SET NULL,
  instrument_id UUID NULL REFERENCES msa_instruments(id) ON DELETE SET NULL,
  calibration_reference_id UUID NULL REFERENCES msa_calibration_references(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'PLANNED', 'IN_PROGRESS', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'
  )),
  workflow_stage TEXT NOT NULL DEFAULT 'DRAFT' CHECK (workflow_stage IN (
    'DRAFT', 'PLANNING', 'EXECUTION', 'TECHNICAL_REVIEW', 'APPROVAL', 'ARCHIVE'
  )),
  rejection_reason TEXT NULL,
  notes TEXT NULL,
  planned_at TIMESTAMPTZ NULL,
  started_at TIMESTAMPTZ NULL,
  reviewed_at TIMESTAMPTZ NULL,
  approved_at TIMESTAMPTZ NULL,
  rejected_at TIMESTAMPTZ NULL,
  archived_at TIMESTAMPTZ NULL,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  -- Integração futura (GF-010+) — nullable, sem consumo nesta GF
  quality_inspection_id UUID NULL,
  ppap_submission_id UUID NULL,
  ppap_capability_study_id UUID NULL,
  supplier_ref TEXT NULL,
  production_order_ref TEXT NULL,
  spc_chart_ref TEXT NULL,
  capability_study_ref TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, study_number)
);

CREATE INDEX IF NOT EXISTS idx_msa_studies_company ON msa_measurement_studies(company_id);
CREATE INDEX IF NOT EXISTS idx_msa_studies_status ON msa_measurement_studies(company_id, status);
CREATE INDEX IF NOT EXISTS idx_msa_studies_gauge ON msa_measurement_studies(company_id, gauge_id);

-- Junction: estudo ↔ operador
CREATE TABLE IF NOT EXISTS msa_study_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES msa_measurement_studies(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES msa_operators(id) ON DELETE RESTRICT,
  role_label TEXT NULL DEFAULT 'appraiser',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (study_id, operator_id)
);

CREATE INDEX IF NOT EXISTS idx_msa_study_operators_study ON msa_study_operators(study_id);

-- Junction: estudo ↔ peça
CREATE TABLE IF NOT EXISTS msa_study_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES msa_measurement_studies(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES msa_parts(id) ON DELETE RESTRICT,
  part_sequence SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (study_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_msa_study_parts_study ON msa_study_parts(study_id);

-- Amostras de medição (MeasurementSample)
CREATE TABLE IF NOT EXISTS msa_measurement_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES msa_measurement_studies(id) ON DELETE CASCADE,
  operator_id UUID NULL REFERENCES msa_operators(id) ON DELETE SET NULL,
  part_id UUID NULL REFERENCES msa_parts(id) ON DELETE SET NULL,
  trial_number SMALLINT NOT NULL DEFAULT 1,
  measured_value NUMERIC(14,6) NULL,
  attribute_result TEXT NULL CHECK (attribute_result IS NULL OR attribute_result IN ('pass', 'fail', 'pending')),
  measured_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msa_samples_study ON msa_measurement_samples(study_id);
CREATE INDEX IF NOT EXISTS idx_msa_samples_study_trial ON msa_measurement_samples(study_id, trial_number);

-- Tipos de estudo — tabelas dedicadas (1:1 com estudo)

CREATE TABLE IF NOT EXISTS msa_variable_grr_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES msa_measurement_studies(id) ON DELETE CASCADE,
  grr_method TEXT NOT NULL DEFAULT 'crossed' CHECK (grr_method IN ('crossed', 'nested', 'expanded')),
  num_operators SMALLINT NOT NULL DEFAULT 3,
  num_parts SMALLINT NOT NULL DEFAULT 10,
  num_trials SMALLINT NOT NULL DEFAULT 3,
  tolerance_usl NUMERIC(14,6) NULL,
  tolerance_lsl NUMERIC(14,6) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (study_id)
);

CREATE INDEX IF NOT EXISTS idx_msa_variable_grr_study ON msa_variable_grr_studies(study_id);

CREATE TABLE IF NOT EXISTS msa_attribute_agreement_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES msa_measurement_studies(id) ON DELETE CASCADE,
  agreement_method TEXT NOT NULL DEFAULT 'kappa' CHECK (agreement_method IN ('kappa', 'fleiss', 'cohen')),
  num_operators SMALLINT NOT NULL DEFAULT 3,
  num_parts SMALLINT NOT NULL DEFAULT 30,
  num_trials SMALLINT NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (study_id)
);

CREATE INDEX IF NOT EXISTS idx_msa_attribute_study ON msa_attribute_agreement_studies(study_id);

CREATE TABLE IF NOT EXISTS msa_bias_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES msa_measurement_studies(id) ON DELETE CASCADE,
  reference_value NUMERIC(14,6) NOT NULL,
  num_measurements SMALLINT NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (study_id)
);

CREATE INDEX IF NOT EXISTS idx_msa_bias_study ON msa_bias_studies(study_id);

CREATE TABLE IF NOT EXISTS msa_linearity_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES msa_measurement_studies(id) ON DELETE CASCADE,
  range_min NUMERIC(14,6) NOT NULL,
  range_max NUMERIC(14,6) NOT NULL,
  num_reference_points SMALLINT NOT NULL DEFAULT 5,
  measurements_per_point SMALLINT NOT NULL DEFAULT 12,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (study_id)
);

CREATE INDEX IF NOT EXISTS idx_msa_linearity_study ON msa_linearity_studies(study_id);

CREATE TABLE IF NOT EXISTS msa_stability_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES msa_measurement_studies(id) ON DELETE CASCADE,
  reference_value NUMERIC(14,6) NOT NULL,
  subgroup_size SMALLINT NOT NULL DEFAULT 1,
  num_subgroups SMALLINT NOT NULL DEFAULT 25,
  chart_type TEXT NOT NULL DEFAULT 'i_mr' CHECK (chart_type IN ('i_mr', 'xbar_r', 'xbar_s')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (study_id)
);

CREATE INDEX IF NOT EXISTS idx_msa_stability_study ON msa_stability_studies(study_id);

-- Aprovações formais (StudyApproval)
CREATE TABLE IF NOT EXISTS msa_study_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES msa_measurement_studies(id) ON DELETE CASCADE,
  approval_role TEXT NOT NULL,
  approver_name TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msa_study_approvals_study ON msa_study_approvals(study_id);

-- Histórico workflow (audit trail)
CREATE TABLE IF NOT EXISTS msa_study_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES msa_measurement_studies(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  from_workflow_stage TEXT NOT NULL,
  to_workflow_stage TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msa_study_history_study ON msa_study_history(study_id, created_at DESC);

-- Documentos anexos
CREATE TABLE IF NOT EXISTS msa_attached_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  study_id UUID NOT NULL REFERENCES msa_measurement_studies(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_ref TEXT NULL,
  version TEXT NULL,
  uploaded_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_msa_documents_study ON msa_attached_documents(study_id);

COMMENT ON TABLE msa_measurement_studies IS 'GF-009 — Core MSA MeasurementStudy (AIAG canonical states)';
COMMENT ON TABLE msa_variable_grr_studies IS 'GF-009 — Variable Gauge R&R study extension (1:1)';
COMMENT ON TABLE msa_study_history IS 'Audit trail imutável por transição workflow/status';
