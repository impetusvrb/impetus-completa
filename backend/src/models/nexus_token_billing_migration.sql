-- NexusIA / billing unificado por empresa (tokens) — PostgreSQL
-- Não expor custo_real nem campo servico ao cliente (apenas uso interno).

CREATE TABLE IF NOT EXISTS token_billing_plans (
  plan_type       VARCHAR(50) PRIMARY KEY,
  preco_token_brl DECIMAL(14,8) NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

INSERT INTO token_billing_plans (plan_type, preco_token_brl) VALUES
  ('essencial',    0.00005),
  ('profissional', 0.00004),
  ('estratégico',  0.00003),
  ('enterprise',   0.00002)
ON CONFLICT (plan_type) DO NOTHING;

CREATE TABLE IF NOT EXISTS token_usage (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  servico      VARCHAR(50) NOT NULL,
  quantidade   DECIMAL(18,4) NOT NULL,
  unidade      VARCHAR(20) NOT NULL DEFAULT 'tokens',
  custo_real   DECIMAL(14,6) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_token_usage_company_created ON token_usage (company_id, created_at);

CREATE TABLE IF NOT EXISTS token_invoices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  mes                SMALLINT NOT NULL CHECK (mes >= 1 AND mes <= 12),
  ano                SMALLINT NOT NULL,
  mensalidade_brl    DECIMAL(12,2) NOT NULL DEFAULT 0,
  tokens_totais      BIGINT NOT NULL DEFAULT 0,
  valor_tokens_brl   DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_cobrado_brl  DECIMAL(12,2) NOT NULL DEFAULT 0,
  custo_real_brl     DECIMAL(14,2) NOT NULL DEFAULT 0,
  asaas_payment_id   VARCHAR(100),
  created_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, mes, ano)
);

CREATE INDEX IF NOT EXISTS idx_token_invoices_company ON token_invoices (company_id, ano, mes);
