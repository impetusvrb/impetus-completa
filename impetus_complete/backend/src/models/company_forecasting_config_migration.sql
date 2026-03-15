-- ============================================================================
-- IMPETUS - Configuração de Previsão Operacional e Financeira
-- Receita baseline, parâmetros de simulação (Digital Twin)
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_forecasting_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,

  -- Receita estimada (para projeção Lucro/Prejuízo)
  revenue_per_day NUMERIC(14,2) DEFAULT 0,
  revenue_per_month NUMERIC(14,2) DEFAULT 0,
  revenue_source TEXT DEFAULT 'manual', -- manual, estimated, integrated

  -- Fatores de ajuste (0-100 ou multiplicadores)
  efficiency_baseline NUMERIC(5,2) DEFAULT 75,
  production_capacity_utilization NUMERIC(5,2) DEFAULT 80,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_company_forecasting_config_company ON company_forecasting_config(company_id);
