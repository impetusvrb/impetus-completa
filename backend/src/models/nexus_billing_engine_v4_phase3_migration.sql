-- Nexus Billing Engine v4 — Fase 3: auto-recarga + índices auditoria

ALTER TABLE nexus_company_wallets
  ADD COLUMN IF NOT EXISTS auto_recharge_enabled BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE nexus_company_wallets
  ADD COLUMN IF NOT EXISTS auto_recharge_amount_brl NUMERIC(12, 2) NOT NULL DEFAULT 50
  CHECK (auto_recharge_amount_brl >= 5);

ALTER TABLE nexus_company_wallets
  ADD COLUMN IF NOT EXISTS auto_recharge_min_balance NUMERIC(24, 8) NOT NULL DEFAULT 0
  CHECK (auto_recharge_min_balance >= 0);

CREATE INDEX IF NOT EXISTS idx_billing_ledger_company_dept_month
  ON billing_ledger (company_id, department_id, created_at DESC)
  WHERE department_id IS NOT NULL;

COMMENT ON TABLE billing_ledger IS 'Append-only — Nexus Billing Engine v4. Nunca UPDATE/DELETE.';
