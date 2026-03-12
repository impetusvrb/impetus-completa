-- ============================================================================
-- IMPETUS - SISTEMA DE INTELIGÊNCIA INDUSTRIAL AUTÔNOMA
-- Machine Brain, Monitoramento 24/7, Perfis operacionais, Controle com segurança
-- ============================================================================

-- 1. Configuração de monitoramento por máquina
CREATE TABLE IF NOT EXISTS machine_monitoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  machine_id UUID,
  machine_source TEXT NOT NULL CHECK (machine_source IN ('production_line_machine', 'asset', 'plc_equipment')),
  machine_identifier TEXT NOT NULL,
  machine_name TEXT,
  line_id UUID,
  line_name TEXT,

  data_source_type TEXT DEFAULT 'plc' CHECK (data_source_type IN ('plc', 'iot', 'scada', 'api', 'simulated')),
  data_source_config JSONB DEFAULT '{}',
  collection_interval_sec INTEGER DEFAULT 3 CHECK (collection_interval_sec BETWEEN 1 AND 60),

  enabled BOOLEAN DEFAULT true,
  last_collected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(company_id, machine_source, machine_identifier)
);

CREATE INDEX IF NOT EXISTS idx_machine_monitoring_company ON machine_monitoring_config(company_id);
CREATE INDEX IF NOT EXISTS idx_machine_monitoring_enabled ON machine_monitoring_config(company_id, enabled) WHERE enabled = true;

-- 2. Perfil operacional aprendido (Machine Brain)
CREATE TABLE IF NOT EXISTS machine_operational_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  machine_identifier TEXT NOT NULL,
  machine_name TEXT,
  line_name TEXT,

  temperature_avg NUMERIC(10,2),
  temperature_min NUMERIC(10,2),
  temperature_max NUMERIC(10,2),
  vibration_avg NUMERIC(10,2),
  vibration_max NUMERIC(10,2),
  pressure_avg NUMERIC(10,2),
  pressure_min NUMERIC(10,2),
  pressure_max NUMERIC(10,2),
  electrical_current_avg NUMERIC(10,2),
  rpm_avg NUMERIC(10,2),
  oil_level_min NUMERIC(10,2),
  sample_count INTEGER DEFAULT 0,

  last_calibrated_at TIMESTAMPTZ,
  profile_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_machine_profile_unique ON machine_operational_profiles(company_id, machine_identifier);
CREATE INDEX IF NOT EXISTS idx_machine_profile_company ON machine_operational_profiles(company_id);

-- 3. Eventos detectados automaticamente
CREATE TABLE IF NOT EXISTS machine_detected_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL CHECK (event_type IN (
    'machine_started', 'machine_stopped', 'low_oil', 'overheating',
    'vibration_alert', 'abnormal_noise', 'power_failure', 'compressor_offline',
    'pressure_low', 'pressure_high', 'anomaly_detected', 'predicted_failure'
  )),
  machine_identifier TEXT NOT NULL,
  machine_name TEXT,
  line_name TEXT,

  description TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  sensor_values JSONB DEFAULT '{}',

  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,

  work_order_created UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_machine_events_company ON machine_detected_events(company_id);
CREATE INDEX IF NOT EXISTS idx_machine_events_created ON machine_detected_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_machine_events_type ON machine_detected_events(company_id, event_type);

-- 4. Configuração de automação (modos e permissões)
CREATE TABLE IF NOT EXISTS industrial_automation_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  automation_mode TEXT NOT NULL DEFAULT 'monitor' CHECK (automation_mode IN ('monitor', 'assisted', 'automatic')),
  allowed_roles TEXT[] DEFAULT '{diretor,gerente,coordenador}'::text[],
  enabled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  enabled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_industrial_automation_company ON industrial_automation_config(company_id);

-- 5. Comandos de controle (auditoria)
CREATE TABLE IF NOT EXISTS machine_control_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  machine_identifier TEXT NOT NULL,
  machine_name TEXT,
  command_type TEXT NOT NULL,
  command_value TEXT,
  executed BOOLEAN DEFAULT false,
  execution_response TEXT,

  requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
  requested_mode TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_machine_commands_company ON machine_control_commands(company_id);
CREATE INDEX IF NOT EXISTS idx_machine_commands_created ON machine_control_commands(company_id, created_at DESC);

-- 6. Whitelist de equipamentos permitidos para controle (apenas auxiliares - NUNCA prensa, torno, etc.)
-- Chaves estáticas: compressor, bomba, ventilacao, refrigeracao
CREATE TABLE IF NOT EXISTS equipment_control_whitelist (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  equipment_type_key TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  PRIMARY KEY (company_id, equipment_type_key)
);
