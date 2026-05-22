-- Engine de Identidade Organizacional — cargos estruturais (company_roles)
-- Aditivo: setores oficiais, unidades organizacionais, FKs e governança contextual

CREATE TABLE IF NOT EXISTS organizational_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(32),
  unit_type VARCHAR(40) DEFAULT 'matriz',
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_units_company ON organizational_units (company_id) WHERE active = true;

CREATE TABLE IF NOT EXISTS company_sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  department_id UUID NOT NULL,
  name VARCHAR(120) NOT NULL,
  code VARCHAR(32),
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_sectors_company ON company_sectors (company_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_company_sectors_department ON company_sectors (department_id) WHERE active = true;

ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS internal_code VARCHAR(40);
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS sector_id UUID;
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS organizational_unit_id UUID;
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS operational_scope VARCHAR(40);
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS organizational_function TEXT;
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS operational_context TEXT;
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS criticality_level VARCHAR(20);
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS approval_domains TEXT[];
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS approval_participation_role VARCHAR(80);
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS escalation_participation_role VARCHAR(80);
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS sensitivity_level VARCHAR(40);
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS access_strategic_data BOOLEAN DEFAULT false;
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS access_financial_data BOOLEAN DEFAULT false;
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS access_hr_data BOOLEAN DEFAULT false;
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS access_critical_indicators BOOLEAN DEFAULT false;
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS decision_frequency VARCHAR(40);
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS requires_document_validation BOOLEAN DEFAULT false;
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS requires_hierarchical_approval BOOLEAN DEFAULT false;
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS allow_manual_creation BOOLEAN DEFAULT true;
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS can_view_other_departments BOOLEAN DEFAULT false;
ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS max_scope_limit VARCHAR(40);

CREATE UNIQUE INDEX IF NOT EXISTS uq_company_roles_internal_code
  ON company_roles (company_id, internal_code)
  WHERE internal_code IS NOT NULL AND active = true;
