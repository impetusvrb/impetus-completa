-- ============================================================================
-- CAMPOS DE SETUP EMPRESA - COMPLEMENTO
-- industry_type, initial_areas_count para fluxo de ativação comercial
-- ============================================================================

-- industry_type: tipo de indústria (ex: manufatura, alimentício)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS industry_type TEXT;

-- initial_areas_count: quantidade inicial de áreas configuradas no setup
ALTER TABLE companies ADD COLUMN IF NOT EXISTS initial_areas_count INTEGER DEFAULT 5;

COMMENT ON COLUMN companies.industry_type IS 'Tipo de indústria (manufatura, alimentício, químico, etc)';
COMMENT ON COLUMN companies.initial_areas_count IS 'Quantidade inicial de áreas definidas no setup da empresa';
