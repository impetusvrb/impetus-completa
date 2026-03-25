-- Estoque de pecas ManuIA Gestao de Ativos (opcional)
CREATE TABLE IF NOT EXISTS manuia_spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  qty NUMERIC(12, 2) DEFAULT 0,
  reorder_point NUMERIC(12, 2) DEFAULT 0,
  max_qty NUMERIC(12, 2) DEFAULT 20,
  lead_time_days INT DEFAULT 7,
  consumo_90d NUMERIC(12, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_manuia_spare_parts_company ON manuia_spare_parts(company_id);
