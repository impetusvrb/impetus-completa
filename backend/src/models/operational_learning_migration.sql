-- Aprendizado operacional persistido (taxa de sucesso por máquina e tipo de ação)
-- Única por (empresa, máquina, tipo de ação). Tipo especial __machine_aggregate__ = agregado da máquina.
-- Seguro: IF NOT EXISTS

CREATE TABLE IF NOT EXISTS operational_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  machine_id TEXT NOT NULL,
  action_type TEXT NOT NULL DEFAULT 'intervencao_geral',
  success_rate DOUBLE PRECISION,
  attempts INT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_learning_unique
  ON operational_learning(company_id, machine_id, action_type);

CREATE INDEX IF NOT EXISTS idx_operational_learning_company
  ON operational_learning(company_id, updated_at DESC);
