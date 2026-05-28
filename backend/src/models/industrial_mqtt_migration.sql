-- PROMPT 19 — Industrial MQTT Real Runtime

CREATE TABLE IF NOT EXISTS tenant_mqtt_brokers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'shadow' CHECK (mode IN ('shadow', 'audit', 'on')),
  broker_url TEXT NOT NULL,
  client_id TEXT,
  username TEXT,
  password_env_key TEXT,
  topic_subscriptions TEXT[] NOT NULL DEFAULT ARRAY['plant/#', 'environment/#'],
  qos SMALLINT NOT NULL DEFAULT 1 CHECK (qos BETWEEN 0 AND 2),
  clean_session BOOLEAN NOT NULL DEFAULT true,
  reconnect_period_ms INTEGER NOT NULL DEFAULT 5000,
  connect_timeout_ms INTEGER NOT NULL DEFAULT 30000,
  buffer_max INTEGER NOT NULL DEFAULT 5000,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

CREATE TABLE IF NOT EXISTS mqtt_message_buffer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  qos SMALLINT NOT NULL DEFAULT 1,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  replayed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_mqtt_buffer_company_pending
  ON mqtt_message_buffer (company_id, received_at)
  WHERE replayed_at IS NULL;

CREATE TABLE IF NOT EXISTS mqtt_connection_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  trace_id TEXT NOT NULL,
  event TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'ok',
  broker_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mqtt_audit_company
  ON mqtt_connection_audit (company_id, created_at DESC);
