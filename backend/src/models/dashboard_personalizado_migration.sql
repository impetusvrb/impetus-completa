-- ============================================================================
-- IMPETUS - Dashboard personalizado por perfil (cache de config IA/regras)
-- Ver docs/IMPETUS_Dashboard_Personalizado_Por_Perfil.md
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Campos de perfil no usuário (se a tabela users existir neste schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS funcao TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS descricao TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS nivel_acesso VARCHAR(20) DEFAULT 'tático';
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Cache das configurações de dashboard geradas por perfil (IA ou regras)
CREATE TABLE IF NOT EXISTS dashboard_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID,
  config_json JSONB NOT NULL,
  gerado_em TIMESTAMPTZ DEFAULT now(),
  expira_em TIMESTAMPTZ DEFAULT now() + INTERVAL '24 hours',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_configs_user ON dashboard_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_configs_expira ON dashboard_configs(expira_em);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_configs_user_unique ON dashboard_configs(user_id);

-- Log de acessos (opcional: para IA aprender preferências)
CREATE TABLE IF NOT EXISTS dashboard_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID,
  modulo_id VARCHAR(100),
  tempo_visivel INTEGER,
  acessado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_acessos_user ON dashboard_acessos(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_acessos_em ON dashboard_acessos(acessado_em DESC);
