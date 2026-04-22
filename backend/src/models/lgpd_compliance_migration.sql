-- LGPD: consent_logs, colunas em lgpd_data_requests e users (executar em produção quando aplicável)
-- psql $DATABASE_URL -f backend/src/models/lgpd_compliance_migration.sql

CREATE TABLE IF NOT EXISTS consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  consent_type TEXT NOT NULL,
  document_version TEXT NOT NULL DEFAULT '1.0',
  granted BOOLEAN NOT NULL DEFAULT true,
  consent_text TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_consent_logs_user_created ON consent_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_logs_type ON consent_logs(user_id, consent_type);

CREATE TABLE IF NOT EXISTS lgpd_data_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  response TEXT,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lgpd_data_requests_user ON lgpd_data_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lgpd_data_requests_company ON lgpd_data_requests(company_id, status);

-- Se a tabela já existir de instalações antigas, garantir colunas usadas pelo backend:
ALTER TABLE lgpd_data_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE lgpd_data_requests ADD COLUMN IF NOT EXISTS response TEXT;
ALTER TABLE lgpd_data_requests ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE lgpd_data_requests ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

ALTER TABLE users ADD COLUMN IF NOT EXISTS lgpd_tenant_status TEXT DEFAULT 'ativo';

COMMENT ON COLUMN users.lgpd_tenant_status IS 'Estado LGPD da conta: ativo, inativo (anonimizado), suspenso_pedido, etc.';
