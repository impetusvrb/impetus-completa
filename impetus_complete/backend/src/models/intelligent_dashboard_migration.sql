-- ============================================================================
-- IMPETUS - DASHBOARD INTELIGENTE E PERSONALIZADO POR USUÁRIO
-- Migração: perfil do usuário, preferências, histórico de uso, widgets
-- ============================================================================

-- 1) Novos campos no usuário para dashboard personalizado
ALTER TABLE users ADD COLUMN IF NOT EXISTS functional_area VARCHAR(32);
-- production, maintenance, quality, operations, hr, finance, admin, pcp, general
ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_profile VARCHAR(64);
-- perfil resolvido: supervisor_maintenance, manager_production, etc.
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_kpis JSONB DEFAULT '[]';
-- ["mttr", "ativos_criticos", ...]
ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB DEFAULT '{}';
-- { favorite_period, favorite_sector, compact_mode, cards_order, ... }
ALTER TABLE users ADD COLUMN IF NOT EXISTS seniority_level VARCHAR(24);
-- estrategico, tatico, operacional
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_profile_context JSONB DEFAULT '{}';
-- { focus: [], language_style: "" }

COMMENT ON COLUMN users.functional_area IS 'Área funcional: production, maintenance, quality, operations, hr, finance, admin';
COMMENT ON COLUMN users.dashboard_profile IS 'Perfil de dashboard resolvido: role_area (ex: supervisor_maintenance)';

-- 2) Histórico de uso do dashboard (para personalização por comportamento)
CREATE TABLE IF NOT EXISTS dashboard_usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  event_type VARCHAR(64) NOT NULL,
  -- view_card, click_kpi, open_chart, apply_filter, search_ai, open_module, etc.
  entity_type VARCHAR(64),
  entity_id TEXT,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_usage_user ON dashboard_usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_usage_company ON dashboard_usage_events(company_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_usage_created ON dashboard_usage_events(created_at);
CREATE INDEX IF NOT EXISTS idx_dashboard_usage_event_type ON dashboard_usage_events(event_type);

-- 3) Preferências de dashboard (override por usuário)
CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cards_order JSONB DEFAULT '[]',
  favorite_kpis JSONB DEFAULT '[]',
  default_period VARCHAR(16) DEFAULT '7d',
  default_sector TEXT,
  compact_mode BOOLEAN DEFAULT false,
  pinned_widgets JSONB DEFAULT '[]',
  sections_priority JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4) Widgets configuráveis por perfil (referência)
CREATE TABLE IF NOT EXISTS dashboard_profile_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_code VARCHAR(64) NOT NULL,
  widget_type VARCHAR(32) NOT NULL,
  widget_key VARCHAR(64) NOT NULL,
  config JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  UNIQUE(profile_code, widget_key)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_profile_widgets_profile ON dashboard_profile_widgets(profile_code);
