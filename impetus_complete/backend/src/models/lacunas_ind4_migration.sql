-- ============================================================================
-- IMPETUS - Lacunas Indústria 4.0 (MES/ERP, Digital Twin, Produção Real-time, Edge)
-- Implementação aditiva - não altera tabelas existentes
-- ============================================================================

-- Integração PLC real - config de monitoramento por máquina (Modbus/OPC UA/REST/simulated)
CREATE TABLE IF NOT EXISTS machine_monitoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  machine_identifier TEXT NOT NULL,
  machine_name TEXT,
  line_name TEXT,
  data_source_type TEXT DEFAULT 'simulated',
  data_source_config JSONB DEFAULT '{}',
  collection_interval_sec INT DEFAULT 5,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, machine_identifier)
);

CREATE INDEX IF NOT EXISTS idx_machine_monitoring_company ON machine_monitoring_config(company_id);
CREATE INDEX IF NOT EXISTS idx_machine_monitoring_enabled ON machine_monitoring_config(company_id, enabled);

-- Integração MES/ERP - conectores
CREATE TABLE IF NOT EXISTS integration_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connector_type TEXT NOT NULL DEFAULT 'mes_erp',
  name TEXT NOT NULL,
  endpoint_url TEXT,
  auth_type TEXT DEFAULT 'api_key',
  auth_config JSONB DEFAULT '{}',
  mapping_config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_connectors_company ON integration_connectors(company_id);
CREATE INDEX IF NOT EXISTS idx_integration_connectors_type ON integration_connectors(connector_type);

-- Log de sincronizações MES/ERP
CREATE TABLE IF NOT EXISTS mes_erp_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  connector_id UUID REFERENCES integration_connectors(id) ON DELETE SET NULL,
  sync_type TEXT DEFAULT 'push',
  status TEXT DEFAULT 'success',
  records_count INT DEFAULT 0,
  payload_summary JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mes_erp_sync_company ON mes_erp_sync_log(company_id);
CREATE INDEX IF NOT EXISTS idx_mes_erp_sync_created ON mes_erp_sync_log(created_at DESC);

-- Produção em tempo real - turno, linha, meta
CREATE TABLE IF NOT EXISTS production_shift_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  line_identifier TEXT,
  line_name TEXT,
  shift_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift_code TEXT,
  produced_qty NUMERIC(12,2) DEFAULT 0,
  target_qty NUMERIC(12,2) DEFAULT 0,
  good_qty NUMERIC(12,2) DEFAULT 0,
  scrap_qty NUMERIC(12,2) DEFAULT 0,
  efficiency_pct NUMERIC(6,2),
  downtime_min INT DEFAULT 0,
  source TEXT DEFAULT 'manual',
  source_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, line_identifier, shift_date, shift_code)
);

CREATE INDEX IF NOT EXISTS idx_production_shift_company ON production_shift_data(company_id);
CREATE INDEX IF NOT EXISTS idx_production_shift_date ON production_shift_data(shift_date DESC);

-- Métricas por linha (eficíência, paradas, perdas)
CREATE TABLE IF NOT EXISTS production_line_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  line_identifier TEXT NOT NULL,
  line_name TEXT,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  availability_pct NUMERIC(6,2),
  performance_pct NUMERIC(6,2),
  quality_pct NUMERIC(6,2),
  oee_pct NUMERIC(6,2),
  stops_count INT DEFAULT 0,
  losses_min INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, line_identifier, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_production_line_metrics_company ON production_line_metrics(company_id);

-- Digital Twin - layout da planta
CREATE TABLE IF NOT EXISTS plant_layout_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  layout_data JSONB DEFAULT '{}',
  svg_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Digital Twin - estados em cache por máquina
CREATE TABLE IF NOT EXISTS digital_twin_machine_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  machine_identifier TEXT NOT NULL,
  state_data JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, machine_identifier)
);

CREATE INDEX IF NOT EXISTS idx_digital_twin_states_company ON digital_twin_machine_states(company_id);

-- Edge agents - registro e tokens
CREATE TABLE IF NOT EXISTS edge_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  edge_id TEXT NOT NULL,
  name TEXT,
  token_hash TEXT,
  enabled BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, edge_id)
);

CREATE INDEX IF NOT EXISTS idx_edge_agents_company ON edge_agents(company_id);
