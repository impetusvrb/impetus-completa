-- ============================================================================
-- IMPETUS - Inteligência de RH com Distribuição Automática e Integração de Ponto
-- Ponto, jornada, indicadores, alertas, distribuição por cargo
-- ============================================================================

-- 1) Responsabilidades do usuário (para IA distribuir informações)
ALTER TABLE users ADD COLUMN IF NOT EXISTS hr_responsibilities TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hr_responsibilities_parsed JSONB DEFAULT '[]';
COMMENT ON COLUMN users.hr_responsibilities IS 'Descrição livre das funções (ex: controle de ponto, gestão de folha). IA extrai responsabilidades.';
COMMENT ON COLUMN users.hr_responsibilities_parsed IS 'Array de códigos: controle_ponto, gestao_equipe, gestao_folha, supervisao_producao, admin_departamento';

-- 2) Sistemas de ponto cadastráveis (Admin - catálogo global)
CREATE TABLE IF NOT EXISTS time_clock_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  provider TEXT,
  api_doc_url TEXT,
  auth_type TEXT DEFAULT 'api_key',
  config_schema JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO time_clock_systems (code, name, provider) VALUES
  ('replicon', 'Replicon', 'Replicon'),
  ('folha_ponto', 'Folha de Ponto', 'Genérico'),
  ('ponto_tel', 'PontoTel', 'PontoTel'),
  ('spid', 'SPID', 'SPID'),
  ('custom_api', 'API Customizada', 'Custom')
ON CONFLICT (code) DO NOTHING;

-- 3) Integração de ponto por empresa (Admin configura)
CREATE TABLE IF NOT EXISTS time_clock_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  system_code VARCHAR(64) NOT NULL,

  -- Conexão
  api_url TEXT,
  api_key_encrypted TEXT,
  credentials_encrypted JSONB,
  sync_cron TEXT DEFAULT '0 */1 * * *',
  sync_interval_minutes INTEGER DEFAULT 60,

  -- Mapeamento (opcional)
  employee_id_field TEXT,
  mapping_config JSONB DEFAULT '{}',

  -- Status
  enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  last_sync_error TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_time_clock_integrations_company ON time_clock_integrations(company_id);
CREATE UNIQUE INDEX idx_time_clock_integrations_company_system ON time_clock_integrations(company_id, system_code);

-- 4) Registros de ponto (por funcionário/dia)
CREATE TABLE IF NOT EXISTS time_clock_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  external_employee_id TEXT,
  employee_name TEXT,

  record_date DATE NOT NULL,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  break_start TIMESTAMPTZ,
  break_end TIMESTAMPTZ,
  interval_minutes INTEGER DEFAULT 0,

  worked_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  delay_minutes INTEGER DEFAULT 0,
  early_leave_minutes INTEGER DEFAULT 0,
  absent BOOLEAN DEFAULT false,
  bank_hours_balance NUMERIC(10,2) DEFAULT 0,
  notes TEXT,
  inconsistency TEXT,
  raw_data JSONB DEFAULT '{}',
  source TEXT DEFAULT 'integration',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_time_clock_records_company ON time_clock_records(company_id);
CREATE INDEX idx_time_clock_records_user ON time_clock_records(company_id, user_id, record_date);
CREATE INDEX idx_time_clock_records_date ON time_clock_records(company_id, record_date DESC);

-- 5) Indicadores de RH (snapshot para análise)
CREATE TABLE IF NOT EXISTS hr_indicators_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,

  delay_index NUMERIC(8,2) DEFAULT 0,
  absence_index NUMERIC(8,2) DEFAULT 0,
  overtime_load NUMERIC(12,2) DEFAULT 0,
  fatigue_risk_index NUMERIC(5,2) DEFAULT 0,
  presence_compliance NUMERIC(5,2) DEFAULT 100,
  by_department JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_hr_indicators_company ON hr_indicators_snapshot(company_id);
CREATE INDEX idx_hr_indicators_date ON hr_indicators_snapshot(company_id, snapshot_date DESC);

-- 6) Alertas de RH
CREATE TABLE IF NOT EXISTS hr_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_role_level INTEGER,

  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  sector TEXT,
  department TEXT,
  user_ids_affected UUID[],
  metrics JSONB DEFAULT '{}',
  recommendation TEXT,

  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_hr_alerts_company ON hr_alerts(company_id);
CREATE INDEX idx_hr_alerts_target ON hr_alerts(company_id, target_user_id);
CREATE INDEX idx_hr_alerts_created ON hr_alerts(company_id, created_at DESC);

-- 7) Distribuição de relatórios (quem recebe o quê)
CREATE TABLE IF NOT EXISTS hr_report_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  target_role TEXT,
  target_hierarchy_max INTEGER,
  target_functional_area TEXT[],
  target_responsibilities TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
