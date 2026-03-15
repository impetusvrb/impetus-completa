-- ============================================================================
-- IMPETUS - Módulo Integrações e Conectividades
-- Acesso: Administrador do Software (role admin ou administrador_software)
-- ============================================================================

-- Integrações cadastradas (API REST, Webhook, BD, MQTT, Modbus, OPC-UA, etc.)
CREATE TABLE IF NOT EXISTS system_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  origin_connection TEXT,
  connection_config JSONB DEFAULT '{}',
  frequency_seconds INT DEFAULT 5,
  frequency_mode TEXT DEFAULT 'realtime',
  data_types TEXT[] DEFAULT '{}',
  destination_module TEXT,
  enabled BOOLEAN DEFAULT true,
  last_communication_at TIMESTAMPTZ,
  last_status TEXT DEFAULT 'pending',
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_integrations_company ON system_integrations(company_id);
CREATE INDEX IF NOT EXISTS idx_system_integrations_type ON system_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_system_integrations_enabled ON system_integrations(company_id, enabled);

-- Webhooks gerados para integrações (URL única por integração)
CREATE TABLE IF NOT EXISTS integration_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES system_integrations(id) ON DELETE CASCADE,
  webhook_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_webhooks_integration ON integration_webhooks(integration_id);

-- Log de comunicação (última comunicação, status)
CREATE TABLE IF NOT EXISTS integration_communication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES system_integrations(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  records_count INT DEFAULT 0,
  error_message TEXT,
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integration_comm_log_integration ON integration_communication_log(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_comm_log_created ON integration_communication_log(created_at DESC);

-- Data Lake: repositório central de dados recebidos
CREATE TABLE IF NOT EXISTS data_lake_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES system_integrations(id) ON DELETE SET NULL,
  data_type TEXT,
  source_module TEXT,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_lake_company ON data_lake_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_data_lake_integration ON data_lake_entries(integration_id);
CREATE INDEX IF NOT EXISTS idx_data_lake_received ON data_lake_entries(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_lake_data_type ON data_lake_entries(company_id, data_type);

