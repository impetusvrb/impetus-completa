-- Log de atividade do usuário para Resumo Inteligente
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,

  activity_type TEXT NOT NULL,  -- 'search', 'view', 'kpi_request', 'diagnostic', 'proposal_view'
  entity_type TEXT,             -- 'communication', 'proposal', 'dashboard', 'biblioteca'
  entity_id UUID,
  context JSONB,                -- { query, filters, kpi_type, etc }

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_activity_user ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_company ON user_activity_logs(company_id);
CREATE INDEX idx_user_activity_created ON user_activity_logs(created_at DESC);
CREATE INDEX idx_user_activity_type ON user_activity_logs(activity_type);
