-- ============================================================================
-- IMPETUS — Alertas operacionais persistidos (painel, IA central, motor decisão)
-- Campos base: id, company_id, severidade (severity), mensagem (message), source, created_at
-- + colunas legadas já usadas pelo código (tipo_alerta, titulo, metadata, resolução, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS operational_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  tipo_alerta TEXT NOT NULL DEFAULT 'generic',
  titulo TEXT,
  mensagem TEXT,
  severidade TEXT NOT NULL DEFAULT 'media',
  source TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  equipamento TEXT,
  linha TEXT,
  evento_origem_id UUID,
  resolvido BOOLEAN NOT NULL DEFAULT false,
  resolvido_por UUID REFERENCES users(id) ON DELETE SET NULL,
  resolvido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE operational_alerts ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE operational_alerts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE operational_alerts ADD COLUMN IF NOT EXISTS equipamento TEXT;
ALTER TABLE operational_alerts ADD COLUMN IF NOT EXISTS linha TEXT;
ALTER TABLE operational_alerts ADD COLUMN IF NOT EXISTS evento_origem_id UUID;
ALTER TABLE operational_alerts ADD COLUMN IF NOT EXISTS resolvido BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE operational_alerts ADD COLUMN IF NOT EXISTS resolvido_por UUID;
ALTER TABLE operational_alerts ADD COLUMN IF NOT EXISTS resolvido_em TIMESTAMPTZ;
ALTER TABLE operational_alerts ADD COLUMN IF NOT EXISTS titulo TEXT;
ALTER TABLE operational_alerts ADD COLUMN IF NOT EXISTS mensagem TEXT;
ALTER TABLE operational_alerts ADD COLUMN IF NOT EXISTS severidade TEXT;
ALTER TABLE operational_alerts ADD COLUMN IF NOT EXISTS tipo_alerta TEXT;

CREATE INDEX IF NOT EXISTS idx_operational_alerts_company_open_created
  ON operational_alerts (company_id, created_at DESC)
  WHERE resolvido IS NOT TRUE;

CREATE INDEX IF NOT EXISTS idx_operational_alerts_ode_dedupe
  ON operational_alerts (company_id, tipo_alerta, created_at DESC)
  WHERE resolvido IS NOT TRUE AND tipo_alerta LIKE 'operational_decision:%';
