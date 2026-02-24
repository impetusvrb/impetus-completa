-- Configuração de visibilidade do dashboard por hierarquia
-- O Diretor (hierarchy 1) configura o que cada nível vê. CEO (hierarchy 0) sempre vê tudo.

CREATE TABLE IF NOT EXISTS dashboard_visibility_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  hierarchy_level INTEGER NOT NULL CHECK (hierarchy_level BETWEEN 2 AND 5),
  sections JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, hierarchy_level)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_vis_company ON dashboard_visibility_config(company_id);

-- Seções disponíveis (chaves do JSONB sections):
-- operational_interactions, ai_insights, monitored_points, proposals,
-- trend_chart, points_chart, insights_list, recent_interactions,
-- smart_summary, plc_alerts, kpi_request, communication_panel

COMMENT ON TABLE dashboard_visibility_config IS 'Configuração de visibilidade do dashboard por nível hierárquico (2-5). CEO=0 sempre vê tudo.';
