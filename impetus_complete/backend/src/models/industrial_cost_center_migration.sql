-- ============================================================================
-- IMPETUS - Centro de Custos Industriais
-- Cadastro de custos operacionais, cálculo de impacto financeiro
-- Admin configura; CEO/Diretores visualizam relatórios
-- ============================================================================

-- Categorias fixas: maquinas, linhas_producao, funcionarios, energia, materia_prima, retrabalho, manutencao, custos_fixos
CREATE TABLE IF NOT EXISTS industrial_cost_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  display_order INTEGER DEFAULT 0
);

INSERT INTO industrial_cost_categories (id, label, display_order) VALUES
  ('maquinas', 'Máquinas', 1),
  ('linhas_producao', 'Linhas de produção', 2),
  ('funcionarios', 'Funcionários', 3),
  ('energia', 'Energia', 4),
  ('materia_prima', 'Matéria-prima', 5),
  ('retrabalho', 'Retrabalho', 6),
  ('manutencao', 'Manutenção', 7),
  ('custos_fixos', 'Custos fixos da empresa', 8)
ON CONFLICT (id) DO NOTHING;

-- Itens de custo cadastrados pelo Admin (por empresa)
CREATE TABLE IF NOT EXISTS industrial_cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  sector TEXT,
  category_id TEXT NOT NULL REFERENCES industrial_cost_categories(id) ON DELETE RESTRICT,

  -- Financeiros base
  cost_per_hour NUMERIC(14,2) DEFAULT 0,
  cost_per_day NUMERIC(14,2) DEFAULT 0,
  cost_per_month NUMERIC(14,2) DEFAULT 0,
  cost_per_year NUMERIC(14,2) DEFAULT 0,

  -- Operacionais (impacto)
  cost_downtime_per_hour NUMERIC(14,2) DEFAULT 0,
  cost_production_loss NUMERIC(14,2) DEFAULT 0,
  cost_rework NUMERIC(14,2) DEFAULT 0,
  cost_labor_associated NUMERIC(14,2) DEFAULT 0,

  -- Vinculação opcional (máquina, linha)
  machine_identifier TEXT,
  line_identifier TEXT,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cost_items_company ON industrial_cost_items(company_id);
CREATE INDEX idx_cost_items_category ON industrial_cost_items(company_id, category_id);
CREATE INDEX idx_cost_items_machine ON industrial_cost_items(company_id, machine_identifier) WHERE machine_identifier IS NOT NULL;

-- Eventos com impacto financeiro calculado (auditoria)
CREATE TABLE IF NOT EXISTS industrial_cost_impact_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,
  event_source_id UUID,
  machine_identifier TEXT,
  line_identifier TEXT,
  description TEXT,

  duration_hours NUMERIC(10,2) DEFAULT 0,
  calculated_impact NUMERIC(14,2) NOT NULL DEFAULT 0,
  impact_breakdown JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cost_impact_company ON industrial_cost_impact_events(company_id);
CREATE INDEX idx_cost_impact_created ON industrial_cost_impact_events(company_id, created_at DESC);
