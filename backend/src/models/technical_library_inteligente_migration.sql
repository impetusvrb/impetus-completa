-- Biblioteca Técnica Inteligente / Central Técnica de Ativos 3D (ManuIA)
-- Multi-tenant: todas as tabelas com company_id e RLS lógico por aplicação

CREATE TABLE IF NOT EXISTS technical_library_equipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  internal_machine_code TEXT,
  manuia_machine_id UUID REFERENCES manuia_machines(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  serial_number TEXT,
  year INT,
  category TEXT,
  subcategory TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  location TEXT,
  technical_description TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'em_revisao')),
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  ia_processing_meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, internal_machine_code)
);

CREATE INDEX IF NOT EXISTS idx_tle_company ON technical_library_equipments(company_id);
CREATE INDEX IF NOT EXISTS idx_tle_company_active ON technical_library_equipments(company_id, active);
CREATE INDEX IF NOT EXISTS idx_tle_machine_code ON technical_library_equipments(company_id, internal_machine_code);
CREATE INDEX IF NOT EXISTS idx_tle_manuia_machine ON technical_library_equipments(manuia_machine_id);
CREATE INDEX IF NOT EXISTS idx_tle_category ON technical_library_equipments(company_id, category);
CREATE INDEX IF NOT EXISTS idx_tle_name_lower ON technical_library_equipments(company_id, lower(name));
CREATE INDEX IF NOT EXISTS idx_tle_manufacturer_lower ON technical_library_equipments(company_id, lower(manufacturer));

CREATE TABLE IF NOT EXISTS technical_library_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES technical_library_equipments(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  keyword_type TEXT DEFAULT 'generic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tlk_company_equipment ON technical_library_keywords(company_id, equipment_id);
CREATE INDEX IF NOT EXISTS idx_tlk_keyword_lower ON technical_library_keywords(company_id, lower(keyword));

CREATE TABLE IF NOT EXISTS technical_library_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES technical_library_equipments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  format TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  version TEXT,
  default_scale NUMERIC(12, 6) DEFAULT 1,
  rotation_x NUMERIC(12, 6) DEFAULT 0,
  rotation_y NUMERIC(12, 6) DEFAULT 0,
  rotation_z NUMERIC(12, 6) DEFAULT 0,
  position_x NUMERIC(12, 6),
  position_y NUMERIC(12, 6),
  position_z NUMERIC(12, 6),
  notes TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  preview_url TEXT,
  unity_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tlm_company_equipment ON technical_library_models(company_id, equipment_id);
CREATE INDEX IF NOT EXISTS idx_tlm_primary ON technical_library_models(company_id, equipment_id, is_primary);

CREATE TABLE IF NOT EXISTS technical_library_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES technical_library_equipments(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  language TEXT,
  version TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tld_company_equipment ON technical_library_documents(company_id, equipment_id);
CREATE INDEX IF NOT EXISTS idx_tld_type ON technical_library_documents(company_id, doc_type);

CREATE TABLE IF NOT EXISTS technical_library_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES technical_library_equipments(id) ON DELETE CASCADE,
  part_code TEXT NOT NULL,
  name TEXT NOT NULL,
  technical_name TEXT,
  subsystem TEXT,
  description TEXT,
  reference_position TEXT,
  estimated_dimension TEXT,
  criticality TEXT DEFAULT 'media' CHECK (criticality IN ('baixa', 'media', 'alta', 'critica')),
  default_status TEXT,
  notes TEXT,
  created_by_ai BOOLEAN NOT NULL DEFAULT false,
  validated_by_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, equipment_id, part_code)
);

CREATE INDEX IF NOT EXISTS idx_tlp_company_equipment ON technical_library_parts(company_id, equipment_id);
CREATE INDEX IF NOT EXISTS idx_tlp_code ON technical_library_parts(company_id, lower(part_code));

CREATE TABLE IF NOT EXISTS technical_library_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES technical_library_equipments(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tla_company_created ON technical_library_audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tla_equipment ON technical_library_audit_logs(equipment_id);
