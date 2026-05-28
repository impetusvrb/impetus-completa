-- PROMPT 20 — Industrial OPC-UA Real Runtime

CREATE TABLE IF NOT EXISTS tenant_opcua_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'shadow' CHECK (mode IN ('shadow', 'audit', 'on')),
  endpoint_url TEXT NOT NULL,
  application_name TEXT DEFAULT 'IMPETUS_OPCUA',
  security_mode TEXT NOT NULL DEFAULT 'None',
  security_policy TEXT NOT NULL DEFAULT 'None',
  username TEXT,
  password_env_key TEXT,
  node_subscriptions TEXT[] NOT NULL DEFAULT ARRAY['ns=2;s=Simulator1'],
  sampling_interval_ms INTEGER NOT NULL DEFAULT 1000,
  publishing_interval_ms INTEGER NOT NULL DEFAULT 1000,
  session_timeout_ms INTEGER NOT NULL DEFAULT 60000,
  reconnect_period_ms INTEGER NOT NULL DEFAULT 5000,
  max_retry INTEGER NOT NULL DEFAULT 10,
  buffer_max INTEGER NOT NULL DEFAULT 5000,
  default_unit TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

CREATE TABLE IF NOT EXISTS opcua_sample_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status_code TEXT DEFAULT 'Good',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  replayed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_opcua_buffer_company_pending
  ON opcua_sample_buffer (company_id, received_at)
  WHERE replayed_at IS NULL;

CREATE TABLE IF NOT EXISTS opcua_connection_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  trace_id TEXT NOT NULL,
  event TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'ok',
  endpoint_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opcua_audit_company
  ON opcua_connection_audit (company_id, created_at DESC);
