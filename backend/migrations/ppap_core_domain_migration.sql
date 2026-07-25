-- =============================================================================
-- GF-002 — PPAP Core Domain (AIAG/VDA canonical model)
-- Aditivo, idempotente. Sem alteração a tabelas homologadas Quality/Logistics.
-- =============================================================================

-- Níveis AIAG 1–5 (catálogo congelado)
CREATE TABLE IF NOT EXISTS ppap_submission_level_catalog (
  level SMALLINT PRIMARY KEY CHECK (level BETWEEN 1 AND 5),
  aiag_name TEXT NOT NULL,
  vda_name TEXT NOT NULL,
  requirements_summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO ppap_submission_level_catalog (level, aiag_name, vda_name, requirements_summary)
VALUES
  (1, 'Level 1 — Warrant only', 'Stufe 1', 'PSW only'),
  (2, 'Level 2 — Warrant + product/sample', 'Stufe 2', 'PSW + limited product/sample evidence'),
  (3, 'Level 3 — Warrant + limited data', 'Stufe 3', 'PSW + partial PPAP elements per AIAG'),
  (4, 'Level 4 — Customer-defined subset', 'Stufe 4', 'PSW + customer-specific element subset'),
  (5, 'Level 5 — Full documentation', 'Stufe 5', 'PSW + full 18-element PPAP package')
ON CONFLICT (level) DO NOTHING;

-- Partes
CREATE TABLE IF NOT EXISTS ppap_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  part_number TEXT NOT NULL,
  part_name TEXT NOT NULL,
  revision TEXT NOT NULL DEFAULT 'A',
  drawing_number TEXT NULL,
  material_spec TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, part_number, revision)
);

CREATE INDEX IF NOT EXISTS idx_ppap_parts_company ON ppap_parts(company_id);
CREATE INDEX IF NOT EXISTS idx_ppap_parts_number ON ppap_parts(company_id, part_number);

-- Fornecedores PPAP
CREATE TABLE IF NOT EXISTS ppap_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  supplier_code TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  contact_email TEXT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, supplier_code)
);

CREATE INDEX IF NOT EXISTS idx_ppap_suppliers_company ON ppap_suppliers(company_id);

-- Clientes OEM
CREATE TABLE IF NOT EXISTS ppap_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customer_code TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, customer_code)
);

CREATE INDEX IF NOT EXISTS idx_ppap_customers_company ON ppap_customers(company_id);

-- Submissão principal
CREATE TABLE IF NOT EXISTS ppap_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submission_number TEXT NOT NULL,
  part_id UUID NOT NULL REFERENCES ppap_parts(id) ON DELETE RESTRICT,
  supplier_id UUID NOT NULL REFERENCES ppap_suppliers(id) ON DELETE RESTRICT,
  customer_id UUID NULL REFERENCES ppap_customers(id) ON DELETE SET NULL,
  submission_level SMALLINT NOT NULL REFERENCES ppap_submission_level_catalog(level),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'UNDER_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED', 'SUPERSEDED'
  )),
  workflow_stage TEXT NOT NULL DEFAULT 'DRAFT' CHECK (workflow_stage IN (
    'DRAFT', 'SUBMISSION', 'TECHNICAL_REVIEW', 'QUALITY_REVIEW', 'APPROVAL', 'RELEASE'
  )),
  superseded_by_id UUID NULL REFERENCES ppap_submissions(id) ON DELETE SET NULL,
  rejection_reason TEXT NULL,
  notes TEXT NULL,
  submitted_at TIMESTAMPTZ NULL,
  approved_at TIMESTAMPTZ NULL,
  rejected_at TIMESTAMPTZ NULL,
  expires_at TIMESTAMPTZ NULL,
  released_at TIMESTAMPTZ NULL,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  -- Integração futura (GF-003+) — nullable
  quality_inspection_id UUID NULL,
  raw_material_lot_id UUID NULL,
  raw_material_receipt_id UUID NULL,
  fmea_study_ref TEXT NULL,
  ishikawa_analysis_ref TEXT NULL,
  supplier_scorecard_ref TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, submission_number)
);

CREATE INDEX IF NOT EXISTS idx_ppap_submissions_company ON ppap_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_ppap_submissions_status ON ppap_submissions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_ppap_submissions_part ON ppap_submissions(company_id, part_id);
CREATE INDEX IF NOT EXISTS idx_ppap_submissions_supplier ON ppap_submissions(company_id, supplier_id);

-- PSW (Part Submission Warrant)
CREATE TABLE IF NOT EXISTS ppap_psw_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES ppap_submissions(id) ON DELETE CASCADE,
  warrant_number TEXT NULL,
  warrant_date DATE NULL,
  signatory_name TEXT NULL,
  signatory_title TEXT NULL,
  customer_approval_required BOOLEAN NOT NULL DEFAULT true,
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (submission_id)
);

CREATE INDEX IF NOT EXISTS idx_ppap_psw_submission ON ppap_psw_records(submission_id);

-- Resultados dimensionais
CREATE TABLE IF NOT EXISTS ppap_dimensional_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES ppap_submissions(id) ON DELETE CASCADE,
  characteristic_name TEXT NOT NULL,
  nominal NUMERIC(14,6) NULL,
  tolerance_upper NUMERIC(14,6) NULL,
  tolerance_lower NUMERIC(14,6) NULL,
  measured_value NUMERIC(14,6) NULL,
  unit TEXT NULL DEFAULT 'mm',
  result TEXT NULL CHECK (result IN ('conforming', 'non_conforming', 'pending')),
  inspection_date DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppap_dimensional_submission ON ppap_dimensional_results(submission_id);

-- Certificação material
CREATE TABLE IF NOT EXISTS ppap_material_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES ppap_submissions(id) ON DELETE CASCADE,
  cert_type TEXT NOT NULL,
  cert_number TEXT NOT NULL,
  issuer TEXT NULL,
  issue_date DATE NULL,
  expiry_date DATE NULL,
  material_grade TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppap_material_cert_submission ON ppap_material_certifications(submission_id);

-- Estudo de capacidade (Cp/Cpk)
CREATE TABLE IF NOT EXISTS ppap_capability_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES ppap_submissions(id) ON DELETE CASCADE,
  characteristic_name TEXT NOT NULL,
  cp NUMERIC(10,4) NULL,
  cpk NUMERIC(10,4) NULL,
  pp NUMERIC(10,4) NULL,
  ppk NUMERIC(10,4) NULL,
  sample_size INTEGER NULL,
  usl NUMERIC(14,6) NULL,
  lsl NUMERIC(14,6) NULL,
  study_date DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppap_capability_submission ON ppap_capability_studies(submission_id);

-- Aprovação aparência
CREATE TABLE IF NOT EXISTS ppap_appearance_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES ppap_submissions(id) ON DELETE CASCADE,
  standard_reference TEXT NULL,
  result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('approved', 'rejected', 'pending')),
  inspector_name TEXT NULL,
  inspection_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppap_appearance_submission ON ppap_appearance_approvals(submission_id);

-- Testes de desempenho
CREATE TABLE IF NOT EXISTS ppap_performance_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES ppap_submissions(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_method TEXT NULL,
  specification TEXT NULL,
  measured_value TEXT NULL,
  result TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pass', 'fail', 'pending')),
  test_date DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppap_performance_submission ON ppap_performance_tests(submission_id);

-- Alterações de engenharia (ECN)
CREATE TABLE IF NOT EXISTS ppap_engineering_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES ppap_submissions(id) ON DELETE CASCADE,
  ecn_number TEXT NOT NULL,
  change_description TEXT NOT NULL,
  change_date DATE NULL,
  approved_by_customer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppap_ecn_submission ON ppap_engineering_changes(submission_id);

-- Histórico de aprovação
CREATE TABLE IF NOT EXISTS ppap_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES ppap_submissions(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  from_workflow_stage TEXT NOT NULL,
  to_workflow_stage TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppap_approval_history_submission ON ppap_approval_history(submission_id, created_at DESC);

-- Documentos anexos
CREATE TABLE IF NOT EXISTS ppap_attached_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES ppap_submissions(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_ref TEXT NULL,
  aiag_element_number SMALLINT NULL CHECK (aiag_element_number IS NULL OR (aiag_element_number BETWEEN 1 AND 18)),
  version TEXT NULL,
  uploaded_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppap_documents_submission ON ppap_attached_documents(submission_id);
CREATE INDEX IF NOT EXISTS idx_ppap_documents_type ON ppap_attached_documents(company_id, document_type);

COMMENT ON TABLE ppap_submissions IS 'GF-002 — Core PPAP submission (AIAG/VDA canonical states)';
COMMENT ON TABLE ppap_approval_history IS 'Audit trail imutável por transição workflow/status';
