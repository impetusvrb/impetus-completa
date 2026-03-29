-- Biblioteca técnica de equipamentos (admin): mídia em ativos + peças enriquecidas
ALTER TABLE assets ADD COLUMN IF NOT EXISTS model_3d_url TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS manual_pdf_url TEXT;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS model_3d_is_primary BOOLEAN DEFAULT false;

ALTER TABLE manuia_spare_parts ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES assets(id) ON DELETE SET NULL;
ALTER TABLE manuia_spare_parts ADD COLUMN IF NOT EXISTS suggested_by_ai BOOLEAN DEFAULT false;
ALTER TABLE manuia_spare_parts ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;
ALTER TABLE manuia_spare_parts ADD COLUMN IF NOT EXISTS keywords TEXT[];
