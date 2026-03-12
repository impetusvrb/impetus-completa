-- ============================================================================
-- IMPETUS - Detecção e Bloqueio Inteligente de Lotes de Matéria-Prima
-- Monitoramento contínuo, análise de risco, alertas, bloqueio, histórico
-- ============================================================================

-- 1) Colunas de lote em tabelas existentes (para cruzamento de dados)
ALTER TABLE tpm_incidents ADD COLUMN IF NOT EXISTS lot_code TEXT;
ALTER TABLE tpm_incidents ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE tpm_incidents ADD COLUMN IF NOT EXISTS material_name TEXT;
CREATE INDEX IF NOT EXISTS idx_tpm_incidents_lot ON tpm_incidents(company_id, lot_code) WHERE lot_code IS NOT NULL;

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS lot_code TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS material_name TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS machine_used TEXT;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_lot ON proposals(company_id, lot_code) WHERE lot_code IS NOT NULL;

ALTER TABLE intelligent_registrations ADD COLUMN IF NOT EXISTS lot_identified TEXT;
ALTER TABLE intelligent_registrations ADD COLUMN IF NOT EXISTS supplier_identified TEXT;
CREATE INDEX IF NOT EXISTS idx_intelligent_reg_lot ON intelligent_registrations(company_id, lot_identified) WHERE lot_identified IS NOT NULL;

-- 2) Cadastro de lotes de matéria-prima
CREATE TABLE IF NOT EXISTS raw_material_lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  lot_code TEXT NOT NULL,
  material_name TEXT,
  supplier_name TEXT,
  supplier_id UUID,
  product_id UUID,

  -- Status: released (liberado), in_analysis (em análise), quality_risk (risco), blocked (bloqueado)
  status TEXT NOT NULL DEFAULT 'released' CHECK (status IN ('released', 'in_analysis', 'quality_risk', 'blocked')),
  status_reason TEXT,
  blocked_at TIMESTAMPTZ,
  blocked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Métricas agregadas (para detecção)
  defect_count INTEGER DEFAULT 0,
  rework_count INTEGER DEFAULT 0,
  inspection_fail_count INTEGER DEFAULT 0,
  risk_score NUMERIC(5,2) DEFAULT 0,
  last_risk_calculation_at TIMESTAMPTZ,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(company_id, lot_code)
);

CREATE INDEX IF NOT EXISTS idx_raw_material_lots_company ON raw_material_lots(company_id);
CREATE INDEX IF NOT EXISTS idx_raw_material_lots_status ON raw_material_lots(company_id, status);
CREATE INDEX IF NOT EXISTS idx_raw_material_lots_supplier ON raw_material_lots(company_id, supplier_name);

-- 3) Uso de lote em produção/qualidade (vínculo flexível)
CREATE TABLE IF NOT EXISTS raw_material_lot_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES raw_material_lots(id) ON DELETE CASCADE,
  lot_code TEXT NOT NULL,

  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  machine_used TEXT,
  operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  operator_name TEXT,
  defect_count INTEGER DEFAULT 0,
  rework_count INTEGER DEFAULT 0,
  inspection_result TEXT,
  usage_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lot_usage_company ON raw_material_lot_usage(company_id);
CREATE INDEX IF NOT EXISTS idx_lot_usage_lot ON raw_material_lot_usage(company_id, lot_code);
CREATE INDEX IF NOT EXISTS idx_lot_usage_source ON raw_material_lot_usage(company_id, source_type, source_id);

-- 4) Eventos de lote (bloqueio, liberação, alerta)
CREATE TABLE IF NOT EXISTS raw_material_lot_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES raw_material_lots(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'block', 'release', 'alert', 'risk_detected', 'analysis', 'action_taken', 'status_change'
  )),
  previous_status TEXT,
  new_status TEXT,
  description TEXT,
  ai_analysis TEXT,
  performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lot_events_company ON raw_material_lot_events(company_id);
CREATE INDEX IF NOT EXISTS idx_lot_events_lot ON raw_material_lot_events(lot_id, created_at DESC);

-- 5) Alertas de risco de lote (IA)
CREATE TABLE IF NOT EXISTS raw_material_lot_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES raw_material_lots(id) ON DELETE CASCADE,

  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  ai_analysis TEXT,
  ai_recommendations JSONB DEFAULT '[]',
  impact_summary TEXT,
  defect_increase_pct NUMERIC(8,2),
  product_affected TEXT,

  target_role TEXT,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lot_alerts_company ON raw_material_lot_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_lot_alerts_lot ON raw_material_lot_alerts(lot_id);
CREATE INDEX IF NOT EXISTS idx_lot_alerts_created ON raw_material_lot_alerts(company_id, created_at DESC);

-- 6) Avaliação de fornecedores (ranking)
CREATE TABLE IF NOT EXISTS supplier_quality_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  supplier_name TEXT NOT NULL,
  lot_count_total INTEGER DEFAULT 0,
  lot_count_blocked INTEGER DEFAULT 0,
  lot_count_quality_risk INTEGER DEFAULT 0,
  defect_frequency NUMERIC(8,2) DEFAULT 0,
  impact_score NUMERIC(8,2) DEFAULT 0,
  quality_rank INTEGER,
  last_calculated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(company_id, supplier_name)
);

CREATE INDEX IF NOT EXISTS idx_supplier_metrics_company ON supplier_quality_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_metrics_rank ON supplier_quality_metrics(company_id, quality_rank);

COMMENT ON TABLE raw_material_lots IS 'Lotes de matéria-prima com status (released, in_analysis, quality_risk, blocked)';
COMMENT ON TABLE raw_material_lot_usage IS 'Uso de lote em TPM, proposals, registros - cruzamento para detecção';
COMMENT ON TABLE raw_material_lot_events IS 'Histórico: bloqueios, liberações, alertas';
COMMENT ON TABLE supplier_quality_metrics IS 'Avaliação de fornecedores baseada em lotes com falha';
