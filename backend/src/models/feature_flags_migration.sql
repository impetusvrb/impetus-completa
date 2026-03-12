-- ============================================================================
-- IMPETUS - Feature Flags (opcional)
-- Habilita/desabilita funcionalidades via banco
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key VARCHAR(64) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT true,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_active ON feature_flags(active) WHERE active = true;
