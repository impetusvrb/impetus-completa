-- PROMPT 21 — Industrial Modbus Real Runtime

CREATE TABLE IF NOT EXISTS tenant_modbus_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'shadow' CHECK (mode IN ('shadow', 'audit', 'on')),
  host TEXT NOT NULL DEFAULT '127.0.0.1',
  port INTEGER NOT NULL DEFAULT 502,
  unit_id SMALLINT NOT NULL DEFAULT 1,
  transport TEXT NOT NULL DEFAULT 'tcp' CHECK (transport IN ('tcp', 'rtu')),
  poll_interval_ms INTEGER NOT NULL DEFAULT 5000,
  connect_timeout_ms INTEGER NOT NULL DEFAULT 10000,
  max_retries INTEGER NOT NULL DEFAULT 3,
  register_map JSONB NOT NULL DEFAULT '[]',
  buffer_max INTEGER NOT NULL DEFAULT 5000,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

CREATE TABLE IF NOT EXISTS modbus_sample_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  register_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  replayed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_modbus_buffer_company_pending
  ON modbus_sample_buffer (company_id, received_at)
  WHERE replayed_at IS NULL;

CREATE TABLE IF NOT EXISTS modbus_connection_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  trace_id TEXT NOT NULL,
  event TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'ok',
  host TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_modbus_audit_company
  ON modbus_connection_audit (company_id, created_at DESC);
