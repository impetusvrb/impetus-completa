-- ============================================================================
-- IMPETUS - Módulo Inteligente de Qualidade com Rastreabilidade
-- Cadastro matérias-primas, entradas de lote, inspeções, distribuição por cargo
-- ============================================================================

-- 1) Cadastro de Matérias-Primas (apenas admin)
CREATE TABLE IF NOT EXISTS raw_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  code TEXT NOT NULL,
  material_type TEXT,
  default_supplier TEXT,
  technical_specs JSONB DEFAULT '{}',
  quality_tolerances JSONB DEFAULT '{}',
  certifications TEXT[] DEFAULT '{}',
  unit TEXT DEFAULT 'UN',

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_raw_materials_company ON raw_materials(company_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_code ON raw_materials(company_id, code);

-- 2) Entradas de lote (recebimento + inspeção)
CREATE TABLE IF NOT EXISTS raw_material_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  raw_material_id UUID REFERENCES raw_materials(id) ON DELETE SET NULL,

  lot_number TEXT NOT NULL,
  supplier_name TEXT,
  receipt_date DATE NOT NULL,
  quantity NUMERIC(14,4) NOT NULL,
  unit TEXT DEFAULT 'UN',

  inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
  inspection_result TEXT CHECK (inspection_result IN ('approved', 'rejected', 'conditional', 'pending')),
  inspection_notes TEXT,
  inspected_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_company ON raw_material_receipts(company_id);
CREATE INDEX IF NOT EXISTS idx_receipts_material ON raw_material_receipts(raw_material_id);
CREATE INDEX IF NOT EXISTS idx_receipts_lot ON raw_material_receipts(company_id, lot_number);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON raw_material_receipts(company_id, receipt_date DESC);

-- 3) Registros de inspeção de qualidade
CREATE TABLE IF NOT EXISTS quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  inspection_date DATE NOT NULL,
  inspection_type TEXT,
  raw_material_id UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  lot_number TEXT,
  product_id UUID REFERENCES company_products(id) ON DELETE SET NULL,
  machine_used TEXT,
  line_id UUID,
  operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  operator_name TEXT,

  result TEXT CHECK (result IN ('conforming', 'non_conforming', 'conditional')),
  defects_count INTEGER DEFAULT 0,
  rework_count INTEGER DEFAULT 0,
  defects_description TEXT,
  corrective_action TEXT,

  inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
  source_type TEXT,
  source_id TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quality_inspections_company ON quality_inspections(company_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_date ON quality_inspections(company_id, inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_lot ON quality_inspections(company_id, lot_number);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_result ON quality_inspections(company_id, result);

-- 4) Vínculo lote com produto em uso (raw_material_lot_usage já existe - adicionar product_id)
ALTER TABLE raw_material_lot_usage ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES company_products(id) ON DELETE SET NULL;

-- 5) Alertas de qualidade (distribuição por cargo)
CREATE TABLE IF NOT EXISTS quality_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  ai_analysis TEXT,
  ai_recommendations JSONB DEFAULT '[]',

  entity_type TEXT,
  entity_id TEXT,
  lot_number TEXT,
  supplier_name TEXT,
  raw_material_id UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  product_id UUID REFERENCES company_products(id) ON DELETE SET NULL,

  target_role_level INTEGER,
  target_functional_area TEXT[],
  metrics JSONB DEFAULT '{}',

  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quality_alerts_company ON quality_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_quality_alerts_created ON quality_alerts(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_alerts_target ON quality_alerts(company_id, target_role_level);

-- 6) Snapshot de indicadores de qualidade (para dashboard/BI)
CREATE TABLE IF NOT EXISTS quality_indicators_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,

  defect_index NUMERIC(8,2) DEFAULT 0,
  rework_index NUMERIC(8,2) DEFAULT 0,
  conformity_rate NUMERIC(8,2) DEFAULT 100,
  by_supplier JSONB DEFAULT '{}',
  by_material JSONB DEFAULT '{}',
  by_machine JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quality_indicators_unique ON quality_indicators_snapshot(company_id, snapshot_date);

COMMENT ON TABLE raw_materials IS 'Cadastro de matérias-primas (admin)';
COMMENT ON TABLE raw_material_receipts IS 'Entradas de lote: fornecedor, data, quantidade, inspeção';
COMMENT ON TABLE quality_inspections IS 'Registros de inspeção de qualidade';
COMMENT ON TABLE quality_alerts IS 'Alertas distribuídos por cargo (supervisor/gerente/diretor/CEO)';
