-- ============================================================================
-- IMPETUS Nexus IA — configuração de modelos ativos por empresa (transparência)
-- Super Admin (portal) define; tenant vê apenas a sua configuração.
-- ============================================================================

CREATE TABLE IF NOT EXISTS nexus_ai_company_model_config (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  chat_provider VARCHAR(32) NOT NULL DEFAULT 'openai',
  chat_model VARCHAR(256),
  supervision_provider VARCHAR(32) NOT NULL DEFAULT 'google_vertex',
  supervision_model VARCHAR(256),
  reports_provider VARCHAR(32) NOT NULL DEFAULT 'anthropic',
  reports_model VARCHAR(256),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_impetus_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

COMMENT ON TABLE nexus_ai_company_model_config IS
  'Modelos contratuais por categoria (chat, supervisão, relatórios) para transparência Nexus IA.';

CREATE INDEX IF NOT EXISTS idx_nexus_ai_company_model_config_updated
  ON nexus_ai_company_model_config (updated_at DESC);
