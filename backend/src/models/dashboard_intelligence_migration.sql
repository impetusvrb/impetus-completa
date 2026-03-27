-- Dashboard inteligente: eventos de uso para personalização (não substitui auditoria de segurança)
CREATE TABLE IF NOT EXISTS dashboard_usage_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id  UUID REFERENCES companies(id) ON DELETE CASCADE,
  event_type  VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64),
  entity_id   VARCHAR(128),
  context     JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_usage_user_time ON dashboard_usage_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_usage_company_time ON dashboard_usage_events (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dashboard_usage_entity ON dashboard_usage_events (user_id, entity_type, entity_id);
