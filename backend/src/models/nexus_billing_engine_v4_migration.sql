-- Nexus Billing Engine v4.0 — ledger append-only + wallet_id por empresa
-- Nunca UPDATE/DELETE em billing_ledger.

ALTER TABLE nexus_company_wallets
  ADD COLUMN IF NOT EXISTS wallet_id UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_nexus_company_wallets_wallet_id
  ON nexus_company_wallets (wallet_id);

-- Backfill wallet_id em linhas existentes (DEFAULT já cobre novas)
UPDATE nexus_company_wallets SET wallet_id = gen_random_uuid() WHERE wallet_id IS NULL;

CREATE TABLE IF NOT EXISTS billing_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL,
  wallet_id UUID NOT NULL,
  department_id UUID,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  provider VARCHAR(64) NOT NULL DEFAULT 'openai',
  model VARCHAR(128),
  service VARCHAR(64) NOT NULL,
  operation VARCHAR(64) NOT NULL DEFAULT 'completion',
  input_tokens NUMERIC(24, 4) NOT NULL DEFAULT 0,
  output_tokens NUMERIC(24, 4) NOT NULL DEFAULT 0,
  cached_tokens NUMERIC(24, 4) NOT NULL DEFAULT 0,
  images INTEGER NOT NULL DEFAULT 0,
  audio_seconds NUMERIC(18, 4) NOT NULL DEFAULT 0,
  embeddings INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER,
  price_brl NUMERIC(18, 8) NOT NULL DEFAULT 0,
  credits_charged NUMERIC(24, 8) NOT NULL DEFAULT 0,
  balance_before NUMERIC(24, 8) NOT NULL,
  balance_after NUMERIC(24, 8) NOT NULL,
  request_id VARCHAR(128) NOT NULL,
  trace_id VARCHAR(128),
  session_id VARCHAR(128),
  conversation_id VARCHAR(128),
  status VARCHAR(32) NOT NULL DEFAULT 'completed',
  gateway VARCHAR(64),
  ip INET,
  user_agent TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_ledger_request_id
  ON billing_ledger (request_id);

CREATE INDEX IF NOT EXISTS idx_billing_ledger_company_created
  ON billing_ledger (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_ledger_wallet_created
  ON billing_ledger (wallet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_billing_ledger_user_created
  ON billing_ledger (user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Gateways globais IMPETUS (somente super-admin)
CREATE TABLE IF NOT EXISTS billing_gateway_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(32) NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  credentials_encrypted BYTEA,
  config JSONB NOT NULL DEFAULT '{}',
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO billing_gateway_config (provider, enabled) VALUES
  ('stripe', false),
  ('mercadopago', false),
  ('asaas', false),
  ('pagbank', false),
  ('pagarme', false),
  ('paypal', false)
ON CONFLICT (provider) DO NOTHING;
