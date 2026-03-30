-- ManuIA como app de extensão: preferências, dispositivos push, caixa de alertas
-- Multi-tenant: company_id + user_id

CREATE TABLE IF NOT EXISTS manuia_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  work_days INT[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  work_start TIME NOT NULL DEFAULT '08:00',
  work_end TIME NOT NULL DEFAULT '18:00',
  on_call BOOLEAN NOT NULL DEFAULT false,
  max_interruption_level TEXT NOT NULL DEFAULT 'urgent'
    CHECK (max_interruption_level IN ('silent', 'normal', 'urgent', 'critical_only')),
  allow_critical_outside_hours BOOLEAN NOT NULL DEFAULT true,
  allow_urgent_outside_hours BOOLEAN NOT NULL DEFAULT false,
  allow_normal_outside_hours BOOLEAN NOT NULL DEFAULT false,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  extra JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mnp_company_user ON manuia_notification_preferences(company_id, user_id);

CREATE TABLE IF NOT EXISTS manuia_mobile_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'web',
  subscription JSONB NOT NULL DEFAULT '{}',
  device_label TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mmd_company_user ON manuia_mobile_devices(company_id, user_id);

CREATE TABLE IF NOT EXISTS manuia_inbox_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'system',
  severity TEXT NOT NULL DEFAULT 'medium',
  alert_level TEXT NOT NULL DEFAULT 'normal'
    CHECK (alert_level IN ('silent', 'normal', 'urgent', 'critical')),
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  machine_id UUID,
  work_order_id UUID,
  requires_ack BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_min_user_created ON manuia_inbox_notifications(company_id, user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_min_unread ON manuia_inbox_notifications(company_id, user_id, read_at) WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS manuia_on_call_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  label TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_moc_company_range ON manuia_on_call_slots(company_id, starts_at, ends_at);
