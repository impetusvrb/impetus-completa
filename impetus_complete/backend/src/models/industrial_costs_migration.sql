-- ============================================================================
-- IMPETUS - Centro de Custos Industriais
-- Cadastro de custos por categoria para cálculo de impacto financeiro pela IA
-- ============================================================================

-- Categorias de custo (enum para consistência)
CREATE TYPE industrial_cost_category AS ENUM (
  'maquinas', 'linhas_producao', 'funcionarios', 'energia',
  'materia_prima', 'retrabalho', 'manutencao', 'custos_fixos'
);

-- Itens de custo cadastrados pelo Admin
CREATE TABLE IF NOT EXISTS industrial_cost_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Identificação
  name TEXT NOT NULL,
  sector TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'maquinas', 'linhas_producao', 'funcionarios', 'energia',
    'materia_prima', 'retrabalho', 'manutencao', 'custos_fixos'
  )),

  -- Vinculação opcional (máquina, linha)
  machine_identifier TEXT,
  line_name TEXT,

  -- Campos financeiros
  cost_per_hour NUMERIC(14,2) DEFAULT 0,
  cost_per_day NUMERIC(14,2) DEFAULT 0,
  cost_per_month NUMERIC(14,2) DEFAULT 0,
  cost_per_year NUMERIC(14,2) DEFAULT 0,

  -- Campos operacionais
  cost_downtime_per_hour NUMERIC(14,2) DEFAULT 0,
  cost_production_loss NUMERIC(14,2) DEFAULT 0,
  cost_rework NUMERIC(14,2) DEFAULT 0,
  cost_labor_associated NUMERIC(14,2) DEFAULT 0,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_industrial_cost_items_company ON industrial_cost_items(company_id);
CREATE INDEX idx_industrial_cost_items_category ON industrial_cost_items(company_id, category);
CREATE INDEX idx_industrial_cost_items_machine ON industrial_cost_items(company_id, machine_identifier) WHERE machine_identifier IS NOT NULL;

-- Registro de impactos calculados (para histórico e relatórios)
CREATE TABLE IF NOT EXISTS industrial_cost_impacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  event_type TEXT,
  machine_identifier TEXT,
  machine_name TEXT,
  line_name TEXT,
  description TEXT,

  -- Duração do evento (horas)
  duration_hours NUMERIC(10,2) DEFAULT 1,

  -- Valores calculados
  total_impact NUMERIC(14,2) NOT NULL DEFAULT 0,
  breakdown JSONB DEFAULT '{}',

  -- Origem
  source_event_id UUID,
  source_type TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_industrial_cost_impacts_company ON industrial_cost_impacts(company_id);
CREATE INDEX idx_industrial_cost_impacts_created ON industrial_cost_impacts(company_id, created_at DESC);
