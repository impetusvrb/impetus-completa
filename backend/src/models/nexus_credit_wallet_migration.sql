-- Nexus IA — carteira de créditos internos por empresa + ledger + taxas por serviço
-- Recargas via Stripe (webhook) ou extensível a PagSeguro.

CREATE TABLE IF NOT EXISTS nexus_company_wallets (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  balance_credits NUMERIC(24, 8) NOT NULL DEFAULT 0 CHECK (balance_credits >= 0),
  consumption_paused BOOLEAN NOT NULL DEFAULT false,
  low_balance_threshold_credits NUMERIC(24, 8) NOT NULL DEFAULT 0 CHECK (low_balance_threshold_credits >= 0),
  low_balance_last_notified_at TIMESTAMPTZ,
  credits_per_brl NUMERIC(18, 6) NOT NULL DEFAULT 1000 CHECK (credits_per_brl > 0),
  stripe_customer_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nexus_wallet_global_rates (
  servico VARCHAR(64) PRIMARY KEY,
  credits_per_unit NUMERIC(24, 8) NOT NULL CHECK (credits_per_unit > 0),
  description TEXT
);

INSERT INTO nexus_wallet_global_rates (servico, credits_per_unit, description) VALUES
  ('chat', 1, 'OpenAI / chat — por token'),
  ('voz', 1.2, 'Voz / realtime'),
  ('claude', 1, 'Anthropic — por token'),
  ('gemini', 0.8, 'Google Gemini — por token'),
  ('avatar', 800, 'Avatar / vídeo — por unidade de uso'),
  ('tts', 0.5, 'TTS — por caractere (ajustar quantidade)'),
  ('analise', 1, 'Análises IA'),
  ('conteudo', 1, 'Geração de conteúdo'),
  ('akool', 120, 'Akool / APIs terceiros — por requisição base'),
  ('openai_embed', 0.3, 'Embeddings'),
  ('outro', 1, 'Padrão')
ON CONFLICT (servico) DO NOTHING;

CREATE TABLE IF NOT EXISTS nexus_wallet_company_rates (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  servico VARCHAR(64) NOT NULL,
  credits_per_unit NUMERIC(24, 8) NOT NULL CHECK (credits_per_unit > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, servico)
);

CREATE TABLE IF NOT EXISTS nexus_wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entry_type VARCHAR(40) NOT NULL,
  credits_delta NUMERIC(24, 8) NOT NULL,
  balance_after NUMERIC(24, 8) NOT NULL,
  servico VARCHAR(64),
  quantidade NUMERIC(24, 8),
  unidade VARCHAR(32),
  ref_external VARCHAR(255),
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nexus_wallet_ledger_company_created ON nexus_wallet_ledger (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS nexus_wallet_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider VARCHAR(32) NOT NULL,
  amount_brl NUMERIC(12, 2) NOT NULL CHECK (amount_brl > 0),
  credits_to_credit NUMERIC(24, 8) NOT NULL CHECK (credits_to_credit > 0),
  stripe_checkout_session_id VARCHAR(255),
  status VARCHAR(24) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nexus_topup_stripe_session
  ON nexus_wallet_topups (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
