-- ============================================================================
-- IMPETUS - DASHBOARD INTELIGENTE - PERSONALIZAÇÃO AVANÇADA
-- Campos adicionais de usuário, permissões por módulo, onboarding
-- ============================================================================

-- 1) Garantir campos de personalização no usuário (idempotente)
ALTER TABLE users ADD COLUMN IF NOT EXISTS seniority_level VARCHAR(24);
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_profile_context JSONB DEFAULT '{}';
COMMENT ON COLUMN users.seniority_level IS 'Nível de senioridade: estrategico, tatico, operacional';
COMMENT ON COLUMN users.ai_profile_context IS 'Contexto para IA: { focus: [], language_style: "" }';

-- 2) Módulos permitidos por perfil (referência para controle de acesso)
CREATE TABLE IF NOT EXISTS dashboard_module_permissions (
  profile_code VARCHAR(64) NOT NULL,
  module_key VARCHAR(64) NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_export BOOLEAN DEFAULT false,
  PRIMARY KEY (profile_code, module_key)
);

-- Seed padrão: perfis têm acesso aos módulos do visible_modules
-- (populado via config; não necessário seed inicial)

-- 3) Onboarding - respostas de personalização do dashboard
CREATE TABLE IF NOT EXISTS user_dashboard_onboarding (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_indicators JSONB DEFAULT '[]',
  primary_focus VARCHAR(64),
  view_preference VARCHAR(24) DEFAULT 'balanced',
  favorite_period VARCHAR(16) DEFAULT '7d',
  supervised_areas JSONB DEFAULT '[]',
  completed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_dashboard_onboarding_user ON user_dashboard_onboarding(user_id);
