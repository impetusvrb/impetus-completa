-- ============================================================================
-- IMPETUS - CAMADA OPERACIONAL DE MANUTENÇÃO
-- Ordens de serviço, preventivas, intervenções técnicas, passagem de turno
-- Memória técnica reutilizável pela IA
-- ============================================================================

-- ============================================================================
-- 1. PREVENTIVAS (criada antes de work_orders por dependência)
-- ============================================================================
CREATE TABLE IF NOT EXISTS maintenance_preventives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES monitored_points(id) ON DELETE SET NULL,
  machine_id UUID,

  title TEXT NOT NULL,
  description TEXT,
  preventive_type TEXT DEFAULT 'routine' CHECK (preventive_type IN ('routine', 'scheduled', 'condition_based', 'inspection')),

  sector TEXT,
  line_name TEXT,
  machine_name TEXT,

  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  completed_at TIMESTAMPTZ,

  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_by UUID REFERENCES users(id) ON DELETE SET NULL,

  checklist JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'cancelled', 'postponed')),

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_maintenance_preventives_company ON maintenance_preventives(company_id);
CREATE INDEX idx_maintenance_preventives_assigned ON maintenance_preventives(assigned_to);
CREATE INDEX idx_maintenance_preventives_scheduled ON maintenance_preventives(scheduled_date);
CREATE INDEX idx_maintenance_preventives_status ON maintenance_preventives(status);
CREATE INDEX idx_maintenance_preventives_equipment ON maintenance_preventives(equipment_id);

-- ============================================================================
-- 2. ORDENS DE SERVIÇO (OS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES monitored_points(id) ON DELETE SET NULL,
  machine_id UUID,

  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'corrective' CHECK (type IN ('corrective', 'preventive', 'predictive', 'inspection', 'calibration', 'adjustment')),

  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  sector TEXT,
  line_name TEXT,
  machine_name TEXT,

  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_parts', 'waiting_support', 'resolved', 'closed', 'cancelled')),

  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  failure_id UUID REFERENCES equipment_failures(id) ON DELETE SET NULL,
  preventive_id UUID REFERENCES maintenance_preventives(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_work_orders_company ON work_orders(company_id);
CREATE INDEX idx_work_orders_assigned ON work_orders(assigned_to);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_equipment ON work_orders(equipment_id);
CREATE INDEX idx_work_orders_scheduled ON work_orders(scheduled_at);
CREATE INDEX idx_work_orders_company_status ON work_orders(company_id, status);

-- ============================================================================
-- 3. INTERVENÇÕES TÉCNICAS (histórico estruturado - memória reutilizável pela IA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS technical_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES monitored_points(id) ON DELETE SET NULL,
  machine_id UUID,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  failure_id UUID REFERENCES equipment_failures(id) ON DELETE SET NULL,

  machine_name TEXT,
  sector TEXT,
  line_name TEXT,

  failure_reported TEXT,
  symptom_observed TEXT,
  cause_identified TEXT,
  action_taken TEXT,
  parts_replaced JSONB DEFAULT '[]',
  tests_performed TEXT[],
  result_obtained TEXT,
  final_status TEXT,
  remaining_pendency TEXT,

  technician_id UUID REFERENCES users(id) ON DELETE SET NULL,
  intervention_date TIMESTAMPTZ DEFAULT now(),
  execution_time_minutes INTEGER,

  observations TEXT,
  ai_used_for_diagnosis BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_technical_interventions_company ON technical_interventions(company_id);
CREATE INDEX idx_technical_interventions_equipment ON technical_interventions(equipment_id);
CREATE INDEX idx_technical_interventions_technician ON technical_interventions(technician_id);
CREATE INDEX idx_technical_interventions_date ON technical_interventions(intervention_date DESC);

-- ============================================================================
-- 4. MANUAIS DE MÁQUINAS (extensão - vincula manuals a máquinas específicas)
-- ============================================================================
-- manuals já existe; adicionar vínculo com production_line_machines se não houver
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS machine_id UUID;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS line_id_manual UUID REFERENCES production_lines(id) ON DELETE SET NULL;
ALTER TABLE manuals ADD COLUMN IF NOT EXISTS document_type TEXT;
-- document_type: manual_operacao, manual_tecnico, manual_manutencao, esquema_eletrico, esquema_pneumatico, diagrama, procedimento_tecnico, checklist_inspecao

-- ============================================================================
-- 5. PASSAGEM DE TURNO
-- ============================================================================
CREATE TABLE IF NOT EXISTS shift_handover (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  shift_date DATE NOT NULL,
  shift_period TEXT,
  handover_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  pending_items JSONB DEFAULT '[]',
  machines_under_observation JSONB DEFAULT '[]',
  open_work_orders JSONB DEFAULT '[]',
  pending_tests JSONB DEFAULT '[]',
  parts_awaiting JSONB DEFAULT '[]',
  notes_for_next_shift TEXT,
  ai_summary TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shift_handover_company ON shift_handover(company_id);
CREATE INDEX idx_shift_handover_technician ON shift_handover(technician_id);
CREATE INDEX idx_shift_handover_date ON shift_handover(shift_date DESC);

-- ============================================================================
-- 6. REGISTRO TÉCNICO DO TURNO (uso do intelligent_registrations com tipo)
-- ============================================================================
-- Reutiliza intelligent_registrations existente; adicionar campo tipo_turno se necessário
-- Ou criar tabela específica para registro técnico enriquecido
CREATE TABLE IF NOT EXISTS turn_technical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  record_date DATE NOT NULL,
  shift_period TEXT,

  raw_text TEXT,
  structured_data JSONB,
  ai_processed BOOLEAN DEFAULT false,

  activities_executed TEXT[],
  failures_found TEXT[],
  parts_replaced TEXT[],
  pending_items TEXT[],
  machines_at_risk TEXT[],
  parts_missing TEXT[],
  technical_observations TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_turn_technical_records_company ON turn_technical_records(company_id);
CREATE INDEX idx_turn_technical_records_user ON turn_technical_records(user_id);
CREATE INDEX idx_turn_technical_records_date ON turn_technical_records(record_date DESC);
