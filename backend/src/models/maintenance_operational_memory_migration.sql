-- Memória operacional de manutenção: intervenções técnicas e preventivas programadas
-- Seguro: IF NOT EXISTS, sem DROP de dados existentes

CREATE TABLE IF NOT EXISTS technical_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  machine_name TEXT,
  sector TEXT,
  line_name TEXT,
  action_taken TEXT,
  failure_found TEXT,
  symptom_observed TEXT,
  cause_identified TEXT,
  parts_replaced TEXT,
  tests_performed TEXT,
  outcome TEXT,
  status TEXT DEFAULT 'completed',
  pending_note TEXT,
  technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
  intervention_date TIMESTAMPTZ DEFAULT now(),
  duration_minutes INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technical_interventions_company_date
  ON technical_interventions(company_id, intervention_date DESC);

CREATE TABLE IF NOT EXISTS maintenance_preventives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  machine_name TEXT,
  sector TEXT,
  preventive_type TEXT DEFAULT 'preventive',
  status TEXT DEFAULT 'scheduled',
  scheduled_date TIMESTAMPTZ,
  checklist JSONB DEFAULT '[]'::jsonb,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_preventives_company_scheduled
  ON maintenance_preventives(company_id, scheduled_date);
