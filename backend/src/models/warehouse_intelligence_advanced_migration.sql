-- ============================================================================
-- IMPETUS - Módulo de Almoxarifado Inteligente - Distribuição e IA
-- Alertas, previsões, detecção de materiais parados, snapshots
-- ============================================================================

-- 1) ALERTAS DE ALMOXARIFADO (distribuição por cargo/área)
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouse_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id UUID REFERENCES warehouse_materials(id) ON DELETE SET NULL,

  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  ai_analysis TEXT,
  ai_recommendations JSONB DEFAULT '[]',

  entity_type TEXT,
  entity_id TEXT,
  metrics JSONB DEFAULT '{}',

  target_role_level INTEGER,
  target_functional_area TEXT[],

  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_alerts_company ON warehouse_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_alerts_created ON warehouse_alerts(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_alerts_material ON warehouse_alerts(material_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_alerts_target ON warehouse_alerts(company_id, target_role_level);

-- 2) PREVISÕES DE NECESSIDADE (IA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouse_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES warehouse_materials(id) ON DELETE CASCADE,

  prediction_date DATE NOT NULL,
  current_quantity NUMERIC(14,4) NOT NULL,
  min_stock NUMERIC(14,4) DEFAULT 0,
  ideal_stock NUMERIC(14,4) DEFAULT 0,

  consumption_rate_per_day NUMERIC(14,4) DEFAULT 0,
  days_until_depletion INTEGER,
  suggested_quantity NUMERIC(14,4),
  insight_text TEXT,

  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_predictions_company ON warehouse_predictions(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_predictions_material ON warehouse_predictions(material_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_predictions_date ON warehouse_predictions(company_id, prediction_date DESC);

-- 3) SNAPSHOT DE INDICADORES (histórico para análise estratégica)
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouse_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,

  total_materials INTEGER DEFAULT 0,
  below_min_count INTEGER DEFAULT 0,
  idle_materials_count INTEGER DEFAULT 0,
  total_movements_30d INTEGER DEFAULT 0,
  consumption_by_type JSONB DEFAULT '{}',
  waste_indicators JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_snapshots_date ON warehouse_snapshots(company_id, snapshot_date DESC);

-- 4) MATERIAIS PARADOS (cache para detecção)
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouse_idle_detection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES warehouse_materials(id) ON DELETE CASCADE,

  last_movement_at TIMESTAMPTZ,
  days_without_movement INTEGER NOT NULL,
  current_quantity NUMERIC(14,4) DEFAULT 0,
  detected_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(company_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_idle_company ON warehouse_idle_detection(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_idle_days ON warehouse_idle_detection(company_id, days_without_movement DESC);
