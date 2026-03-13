-- ============================================================================
-- IMPETUS - Camada Operacional de Manutenção
-- Ordens de serviço, preventivas, intervenções técnicas, pontos monitorados, falhas
-- Usado pelo dashboard do mecânico/eletricista
-- ============================================================================

-- 1. Pontos monitorados (equipamentos para OS e atenção)
-- Compatível com machine_monitoring_config quando empresa usa Inteligência Industrial
CREATE TABLE IF NOT EXISTS monitored_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sector TEXT,
  line_name TEXT,

  operational_status TEXT DEFAULT 'normal' CHECK (operational_status IN ('normal', 'maintenance', 'failure', 'offline')),
  criticality TEXT DEFAULT 'medium' CHECK (criticality IN ('low', 'medium', 'high', 'critical')),

  last_maintenance DATE,
  next_maintenance DATE,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_monitored_points_company ON monitored_points(company_id);
CREATE INDEX IF NOT EXISTS idx_monitored_points_status ON monitored_points(company_id, operational_status, criticality) WHERE active = true;

-- 2. Ordens de serviço (OS)
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'corrective' CHECK (type IN ('corrective', 'preventive', 'predictive', 'inspection', 'other')),

  machine_name TEXT,
  line_name TEXT,
  sector TEXT,
  equipment_id UUID REFERENCES monitored_points(id) ON DELETE SET NULL,

  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_parts', 'waiting_support', 'resolved', 'closed', 'cancelled')),

  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_orders_company_status ON work_orders(company_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned ON work_orders(company_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_work_orders_scheduled ON work_orders(company_id, scheduled_at);

-- 3. Preventivas programadas
CREATE TABLE IF NOT EXISTS maintenance_preventives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  machine_name TEXT,
  sector TEXT,
  preventive_type TEXT DEFAULT 'routine' CHECK (preventive_type IN ('routine', 'inspection', 'calibration', 'lubrication', 'replacement', 'other')),

  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'overdue', 'in_progress', 'completed', 'cancelled')),

  checklist JSONB DEFAULT '[]',
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_preventives_company_date ON maintenance_preventives(company_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_preventives_assigned ON maintenance_preventives(company_id, assigned_to);

-- 4. Intervenções técnicas (histórico do que foi feito - memória operacional)
CREATE TABLE IF NOT EXISTS technical_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES users(id) ON DELETE SET NULL,

  machine_name TEXT NOT NULL,
  sector TEXT,
  equipment_id UUID REFERENCES monitored_points(id) ON DELETE SET NULL,

  -- Registro estruturado
  failure_found TEXT,
  symptom_observed TEXT,
  cause_identified TEXT,
  action_taken TEXT NOT NULL,
  parts_replaced JSONB DEFAULT '[]',
  tests_performed TEXT,
  result_obtained TEXT,
  final_status TEXT CHECK (final_status IN ('resolved', 'partial', 'monitoring', 'escalated')),
  remaining_pendency TEXT,

  intervention_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  execution_minutes INTEGER,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technical_interventions_company ON technical_interventions(company_id);
CREATE INDEX IF NOT EXISTS idx_technical_interventions_technician ON technical_interventions(company_id, technician_id);
CREATE INDEX IF NOT EXISTS idx_technical_interventions_date ON technical_interventions(company_id, intervention_date DESC);

-- 5. Falhas de equipamento (para análise de recorrentes)
CREATE TABLE IF NOT EXISTS equipment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES monitored_points(id) ON DELETE CASCADE,

  failure_description TEXT NOT NULL,
  failure_code TEXT,
  severity TEXT DEFAULT 'medium',

  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'verified')),

  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_equipment_failures_equipment ON equipment_failures(company_id, equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_failures_reported ON equipment_failures(company_id, reported_at DESC);

-- 6. Registro técnico do turno e passagem de turno
CREATE TABLE IF NOT EXISTS shift_technical_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  log_type TEXT NOT NULL CHECK (log_type IN ('turn_record', 'shift_handover')),
  content TEXT NOT NULL,
  structured_data JSONB DEFAULT '{}',

  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shift_logs_company_user ON shift_technical_logs(company_id, user_id, shift_date);

-- Trigger para work_order_created em machine_detected_events (se coluna existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'machine_detected_events') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'machine_detected_events' AND column_name = 'work_order_created') THEN
      ALTER TABLE machine_detected_events ADD COLUMN work_order_created UUID REFERENCES work_orders(id) ON DELETE SET NULL;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
