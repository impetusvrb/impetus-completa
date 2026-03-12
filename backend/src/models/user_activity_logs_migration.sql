-- Log de atividades do usuário para Resumo Inteligente Diário
-- Rastreia buscas, dados acessados e contexto nos últimos 7 dias
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID,
  
  activity_type TEXT NOT NULL,  -- view, search, filter, click, request
  entity_type TEXT,             -- dashboard, proposals, communications, diagnostic, manuals, etc
  entity_id UUID,
  context JSONB DEFAULT '{}',   -- { search_term, filters, page, kpi_requested, etc }
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_company ON user_activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity_logs(created_at DESC);
