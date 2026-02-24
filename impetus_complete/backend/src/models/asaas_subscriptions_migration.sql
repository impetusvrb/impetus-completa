-- ============================================================================
-- ASAAS - CONTROLE DE ASSINATURAS RECORRENTES
-- Integração B2B SaaS com cobrança automática e bloqueio por inadimplência
-- ============================================================================

-- Tabela de assinaturas
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asaas_customer_id TEXT,
  asaas_subscription_id TEXT,
  plan_type TEXT NOT NULL DEFAULT 'profissional',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'overdue', 'suspended', 'canceled')),
  next_due_date DATE,
  grace_period_days INTEGER DEFAULT 10,
  overdue_since_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_customer ON subscriptions(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_sub ON subscriptions(asaas_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_due ON subscriptions(next_due_date);

-- Companies: active + subscription_status
ALTER TABLE companies ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_type TEXT;
COMMENT ON COLUMN companies.subscription_status IS 'pending, active, overdue, suspended, canceled - controlado via webhook Asaas';
COMMENT ON COLUMN companies.plan_type IS 'essencial, profissional, estratégico - plano contratado';

-- Tabela de log de eventos Asaas (auditoria webhook)
CREATE TABLE IF NOT EXISTS asaas_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_asaas_webhook_created ON asaas_webhook_logs(created_at);

-- Tabela de notificações de inadimplência (bloqueio progressivo)
CREATE TABLE IF NOT EXISTS subscription_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('email_day3', 'whatsapp_day5', 'dashboard_day7', 'block_day10')),
  sent_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_sub_notif_subscription ON subscription_notifications(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_notif_company ON subscription_notifications(company_id);
