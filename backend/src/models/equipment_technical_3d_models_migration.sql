-- Catálogo de modelos 3D da Biblioteca técnica (equipamento OU peça, versões)
CREATE TABLE IF NOT EXISTS equipment_technical_3d_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  spare_part_id UUID REFERENCES manuia_spare_parts(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  format TEXT NOT NULL,
  version_label TEXT,
  version_seq INT NOT NULL DEFAULT 1,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  file_size BIGINT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT equipment_3d_one_parent CHECK (
    (asset_id IS NOT NULL AND spare_part_id IS NULL)
    OR (asset_id IS NULL AND spare_part_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_equipment_3d_company ON equipment_technical_3d_models(company_id);
CREATE INDEX IF NOT EXISTS idx_equipment_3d_asset ON equipment_technical_3d_models(company_id, asset_id) WHERE active;
CREATE INDEX IF NOT EXISTS idx_equipment_3d_part ON equipment_technical_3d_models(company_id, spare_part_id) WHERE active;
