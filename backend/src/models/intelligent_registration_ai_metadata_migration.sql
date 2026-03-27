-- Metadados enriquecidos da IA (seções organizadas, perguntas complementares, tipo de acompanhamento)
ALTER TABLE intelligent_registrations ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_intelligent_reg_ai_meta ON intelligent_registrations USING GIN (ai_metadata) WHERE ai_metadata IS NOT NULL AND ai_metadata != '{}'::jsonb;
