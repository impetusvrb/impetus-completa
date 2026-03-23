-- ============================================================================
-- IMPETUS - ManuIA - Migração completa (ordem de dependências respeitada)
-- Pré-requisitos: companies, users (já existentes no schema base)
-- Cria: monitored_points, work_orders (se ausentes) + tabelas ManuIA
-- ============================================================================
-- Execução segura: todas as instruções usam IF NOT EXISTS
-- Rollback: scripts/rollback-manuia-migration.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PRÉ-REQUISITOS: Tabelas referenciadas pelas ManuIA (se ainda não existirem)
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 1. manuia_machines (base)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manuia_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  sector TEXT,
  line_name TEXT,
  monitored_point_id UUID REFERENCES monitored_points(id) ON DELETE SET NULL,
  position_x NUMERIC(10,4) DEFAULT 0,
  position_y NUMERIC(10,4) DEFAULT 0,
  position_z NUMERIC(10,4) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_manuia_machines_company ON manuia_machines(company_id);
CREATE INDEX IF NOT EXISTS idx_manuia_machines_monitored ON manuia_machines(company_id, monitored_point_id) WHERE monitored_point_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. manuia_sensors (FK → manuia_machines)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manuia_sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  machine_id UUID NOT NULL REFERENCES manuia_machines(id) ON DELETE CASCADE,
  sensor_code TEXT NOT NULL,
  sensor_name TEXT,
  sensor_type TEXT DEFAULT 'generic' CHECK (sensor_type IN ('temperature', 'vibration', 'pressure', 'rpm', 'current', 'generic', 'other')),
  unit TEXT,
  min_valid NUMERIC(12,4),
  max_valid NUMERIC(12,4),
  warning_threshold NUMERIC(12,4),
  critical_threshold NUMERIC(12,4),
  last_value NUMERIC(12,4),
  last_read_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(machine_id, sensor_code)
);

CREATE INDEX IF NOT EXISTS idx_manuia_sensors_machine ON manuia_sensors(company_id, machine_id);
CREATE INDEX IF NOT EXISTS idx_manuia_sensors_type ON manuia_sensors(company_id, sensor_type) WHERE active = true;

-- ----------------------------------------------------------------------------
-- 3. manuia_sessions (FK → manuia_machines, work_orders)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manuia_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES manuia_machines(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  session_type TEXT DEFAULT 'diagnostic' CHECK (session_type IN ('diagnostic', 'guidance', 'emergency', 'inspection')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manuia_sessions_company ON manuia_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_manuia_sessions_user ON manuia_sessions(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_manuia_sessions_machine ON manuia_sessions(company_id, machine_id) WHERE machine_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_manuia_sessions_started ON manuia_sessions(company_id, started_at DESC);

-- ----------------------------------------------------------------------------
-- 4. manuia_emergency_events (FK → manuia_machines, manuia_sensors, work_orders)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manuia_emergency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES manuia_machines(id) ON DELETE SET NULL,
  sensor_id UUID REFERENCES manuia_sensors(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('critical_stop', 'sensor_critical', 'anomaly_detected', 'manual_alert', 'other')),
  severity TEXT DEFAULT 'high' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  raw_data JSONB DEFAULT '{}',
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  work_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manuia_emergency_company ON manuia_emergency_events(company_id);
CREATE INDEX IF NOT EXISTS idx_manuia_emergency_machine ON manuia_emergency_events(company_id, machine_id) WHERE machine_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_manuia_emergency_created ON manuia_emergency_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manuia_emergency_unresolved ON manuia_emergency_events(company_id) WHERE resolved_at IS NULL;

-- ----------------------------------------------------------------------------
-- 5. manuia_equipment_research (FK → manuia_sessions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manuia_equipment_research (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  query_normalized TEXT NOT NULL,
  query_original TEXT NOT NULL,
  research_result JSONB NOT NULL DEFAULT '{}',
  equipment_name TEXT,
  equipment_manufacturer TEXT,
  model_3d_type TEXT,
  session_id UUID REFERENCES manuia_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, query_normalized)
);

CREATE INDEX IF NOT EXISTS idx_manuia_equipment_research_company ON manuia_equipment_research(company_id);
CREATE INDEX IF NOT EXISTS idx_manuia_equipment_research_user ON manuia_equipment_research(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_manuia_equipment_research_created ON manuia_equipment_research(company_id, created_at DESC);

-- ----------------------------------------------------------------------------
-- 6. manuia_history (FK → manuia_sessions)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manuia_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES manuia_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('user_message', 'ai_response', 'sensor_alert', 'action_taken', 'diagnostic_result', 'voice_input', 'other')),
  content TEXT,
  structured_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manuia_history_session ON manuia_history(company_id, session_id);
CREATE INDEX IF NOT EXISTS idx_manuia_history_created ON manuia_history(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manuia_history_type ON manuia_history(company_id, event_type);

-- ----------------------------------------------------------------------------
-- 7. manuia_work_order_links (vinculação OS ↔ ManuIA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manuia_work_order_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  manuia_session_id UUID REFERENCES manuia_sessions(id) ON DELETE SET NULL,
  machine_id UUID REFERENCES manuia_machines(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(work_order_id)
);

CREATE INDEX IF NOT EXISTS idx_manuia_wo_links_company ON manuia_work_order_links(company_id);
CREATE INDEX IF NOT EXISTS idx_manuia_wo_links_session ON manuia_work_order_links(company_id, manuia_session_id) WHERE manuia_session_id IS NOT NULL;
