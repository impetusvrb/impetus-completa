-- ============================================================================
-- IMPETUS - Mapa de Vazamento Financeiro
-- Detecção inteligente de perdas operacionais ocultas
-- CEO/Diretores: valores financeiros | Outros: apenas alertas operacionais
-- ============================================================================

-- Detecções agregadas por tipo de perda (ranking, painel)
CREATE TABLE IF NOT EXISTS financial_leakage_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Classificação
  leak_type TEXT NOT NULL CHECK (leak_type IN (
    'maquinas_paradas', 'equipe_ociosa', 'retrabalho', 'baixa_eficiencia',
    'consumo_energetico', 'perda_materia_prima', 'gargalo_produtivo',
    'atraso_operacional', 'manutencao_excessiva', 'outros'
  )),
  sector TEXT,
  line_identifier TEXT,
  machine_identifier TEXT,

  -- Impacto calculado via Centro de Custos
  impact_1h NUMERIC(14,2) DEFAULT 0,
  impact_24h NUMERIC(14,2) DEFAULT 0,
  impact_7d NUMERIC(14,2) DEFAULT 0,
  impact_30d NUMERIC(14,2) DEFAULT 0,

  -- Metadados para IA
  description TEXT,
  possible_cause TEXT,
  event_count INTEGER DEFAULT 0,
  source_ids JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',

  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leak_detections_company ON financial_leakage_detections(company_id);
CREATE INDEX idx_leak_detections_type ON financial_leakage_detections(company_id, leak_type);
CREATE INDEX idx_leak_detections_period ON financial_leakage_detections(company_id, period_end DESC);

-- Alertas automáticos de vazamento
CREATE TABLE IF NOT EXISTS financial_leakage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  detection_id UUID REFERENCES financial_leakage_detections(id) ON DELETE SET NULL,

  alert_type TEXT NOT NULL CHECK (alert_type IN ('spike', 'trend', 'anomaly', 'threshold')),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  title TEXT NOT NULL,
  description TEXT,
  sector TEXT,
  line_identifier TEXT,

  -- Valores (ocultar para não-CEO/Diretor via middleware)
  impact_estimated NUMERIC(14,2),
  impact_period_days INTEGER DEFAULT 30,

  possible_cause TEXT,
  suggestion TEXT,

  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leak_alerts_company ON financial_leakage_alerts(company_id);
CREATE INDEX idx_leak_alerts_created ON financial_leakage_alerts(company_id, created_at DESC);

-- Relatórios IA gerados automaticamente
CREATE TABLE IF NOT EXISTS financial_leakage_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  report_type TEXT NOT NULL DEFAULT 'weekly' CHECK (report_type IN ('daily', 'weekly', 'monthly', 'on_demand')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Conteúdo gerado pela IA
  main_cause TEXT,
  main_cause_impact NUMERIC(14,2),
  main_cause_sector TEXT,
  possible_cause TEXT,
  ai_suggestion TEXT,
  full_report_text TEXT,
  ranking_summary JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leak_reports_company ON financial_leakage_reports(company_id);
CREATE INDEX idx_leak_reports_period ON financial_leakage_reports(company_id, period_end DESC);
