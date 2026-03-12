-- ============================================================================
-- IMPETUS - Detecção Inteligente de Anomalias Operacionais
-- Aprendizado do comportamento normal, monitoramento contínuo, alertas por cargo
-- ============================================================================

-- 1) Baseline aprendido (comportamento esperado por entidade/métrica)
CREATE TABLE IF NOT EXISTS operational_anomaly_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Entidade monitorada
  entity_type TEXT NOT NULL CHECK (entity_type IN (
    'machine', 'line', 'equipment', 'process', 'shift', 'operator', 'material_batch'
  )),
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  metric_name TEXT NOT NULL,

  -- Estatísticas (comportamento normal)
  value_mean NUMERIC(14,4),
  value_std NUMERIC(14,4),
  value_min NUMERIC(14,4),
  value_max NUMERIC(14,4),
  value_p25 NUMERIC(14,4),
  value_p50 NUMERIC(14,4),
  value_p75 NUMERIC(14,4),
  sample_count INTEGER DEFAULT 0,

  -- Janela de aprendizado
  learning_window_days INTEGER DEFAULT 30,
  last_calibrated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_anomaly_baseline_unique
  ON operational_anomaly_baselines(company_id, entity_type, entity_id, metric_name);
CREATE INDEX IF NOT EXISTS idx_anomaly_baseline_company ON operational_anomaly_baselines(company_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_baseline_entity ON operational_anomaly_baselines(company_id, entity_type, entity_id);

-- 2) Anomalias detectadas (histórico)
CREATE TABLE IF NOT EXISTS operational_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- O que foi detectado
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN (
    'production_time_increase', 'material_consumption_variation', 'defect_increase',
    'productivity_drop', 'unusual_shift_behavior', 'process_parameter_out_of_range',
    'unexpected_downtime', 'maintenance_trigger', 'quality_deviation', 'cost_spike'
  )),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Entidades envolvidas
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  affected_area TEXT,
  machine_identifier TEXT,
  line_name TEXT,
  operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  operator_name TEXT,
  material_batch TEXT,
  supplier TEXT,

  -- Valores observados vs esperado
  observed_value NUMERIC(14,4),
  expected_value NUMERIC(14,4),
  deviation_pct NUMERIC(8,2),
  raw_data JSONB DEFAULT '{}',

  -- Análise de causa (IA)
  ai_analysis TEXT,
  possible_causes JSONB DEFAULT '[]',
  related_maintenance TEXT,
  process_changes TEXT,

  -- Status e ações
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  actions_taken JSONB DEFAULT '[]',
  resolution_notes TEXT,

  -- Impacto (integração BI)
  financial_impact NUMERIC(14,2),
  productivity_impact NUMERIC(8,2),
  quality_impact NUMERIC(8,2),

  source_table TEXT,
  source_id UUID,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_anomalies_company ON operational_anomalies(company_id);
CREATE INDEX IF NOT EXISTS idx_operational_anomalies_created ON operational_anomalies(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_anomalies_type ON operational_anomalies(company_id, anomaly_type);
CREATE INDEX IF NOT EXISTS idx_operational_anomalies_entity ON operational_anomalies(company_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_operational_anomalies_ack ON operational_anomalies(company_id, acknowledged);

-- 3) Alertas de anomalia (distribuição por cargo)
CREATE TABLE IF NOT EXISTS operational_anomaly_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  anomaly_id UUID NOT NULL REFERENCES operational_anomalies(id) ON DELETE CASCADE,

  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_role_level INTEGER,
  target_role TEXT,
  alert_level TEXT DEFAULT 'operational' CHECK (alert_level IN ('operational', 'tactical', 'strategic')),

  title TEXT NOT NULL,
  message TEXT,
  severity TEXT DEFAULT 'medium',

  sent_at TIMESTAMPTZ DEFAULT now(),
  read_at TIMESTAMPTZ,
  acknowledged BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_company ON operational_anomaly_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_anomaly ON operational_anomaly_alerts(anomaly_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_target ON operational_anomaly_alerts(company_id, target_user_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_created ON operational_anomaly_alerts(company_id, sent_at DESC);

COMMENT ON TABLE operational_anomaly_baselines IS 'Comportamento normal aprendido para detecção de anomalias';
COMMENT ON TABLE operational_anomalies IS 'Anomalias operacionais detectadas pela IA';
COMMENT ON TABLE operational_anomaly_alerts IS 'Alertas distribuídos por cargo (supervisor/gerente/diretor/CEO)';
