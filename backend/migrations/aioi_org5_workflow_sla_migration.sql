-- =============================================================================
-- AIOI-ORG-5 — Workflow & SLA Readiness Layer
-- Fase:     AIOI-ORG-5
-- Data:     2026-06-10
-- Modo:     ADDITIVE ONLY — sem alteração de tabelas/serviços existentes
-- Spec:     backend/docs/AIOI_SLA_ENGINE_SPECIFICATION.md
--           backend/docs/AIOI_QUEUE_API_SPECIFICATION.md
-- DEPENDS ON: aioi_ioe_foundation_migration.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PARTE 1 — Colunas SLA em industrial_operational_events
-- ---------------------------------------------------------------------------

ALTER TABLE industrial_operational_events
  ADD COLUMN IF NOT EXISTS sla_class       TEXT          NULL,
  ADD COLUMN IF NOT EXISTS due_at          TIMESTAMPTZ   NULL,
  ADD COLUMN IF NOT EXISTS aging_hours     NUMERIC(10,2) NULL,
  ADD COLUMN IF NOT EXISTS breach_state    TEXT          NULL DEFAULT 'ON_TRACK';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_ioe_sla_class'
  ) THEN
    ALTER TABLE industrial_operational_events
      ADD CONSTRAINT chk_ioe_sla_class CHECK (
        sla_class IS NULL OR sla_class IN (
          'CRITICAL_4H', 'HIGH_8H', 'MEDIUM_24H', 'LOW_72H'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_ioe_breach_state'
  ) THEN
    ALTER TABLE industrial_operational_events
      ADD CONSTRAINT chk_ioe_breach_state CHECK (
        breach_state IS NULL OR breach_state IN (
          'ON_TRACK', 'AT_RISK', 'BREACHED'
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ioe_sla_breach
  ON industrial_operational_events (company_id, breach_state, due_at ASC)
  WHERE status IN ('open', 'triaged', 'pending_approval', 'approved', 'in_progress');

-- ---------------------------------------------------------------------------
-- PARTE 2 — Tabela: aioi_executive_queue_snapshot
-- Autoridade canónica ORG-1 — Single Source of Truth CEO Queue
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aioi_executive_queue_snapshot (

  id                UUID          NOT NULL DEFAULT gen_random_uuid(),
  company_id        UUID          NOT NULL,
  tenant_key        TEXT          NOT NULL DEFAULT '',

  snapshot_version  INTEGER       NOT NULL DEFAULT 1,
  generated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  authority         TEXT          NOT NULL DEFAULT 'aioi',
  source_table      TEXT          NOT NULL DEFAULT 'industrial_operational_events',

  item_count        INTEGER       NOT NULL DEFAULT 0,
  items             JSONB         NOT NULL DEFAULT '[]'::jsonb,

  idempotency_key   TEXT          NOT NULL,

  correlation_id    TEXT          NOT NULL DEFAULT '',

  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT pk_aioi_executive_queue_snapshot PRIMARY KEY (id),
  CONSTRAINT uq_aioi_eqs_idempotency UNIQUE (idempotency_key),
  CONSTRAINT chk_aioi_eqs_authority CHECK (authority = 'aioi'),
  CONSTRAINT chk_aioi_eqs_item_count CHECK (item_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_aioi_eqs_company_latest
  ON aioi_executive_queue_snapshot (company_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_aioi_eqs_correlation
  ON aioi_executive_queue_snapshot (correlation_id);

-- RLS
ALTER TABLE aioi_executive_queue_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE aioi_executive_queue_snapshot FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aioi_executive_queue_snapshot_impetus_tenant_isolation
  ON aioi_executive_queue_snapshot;

CREATE POLICY aioi_executive_queue_snapshot_impetus_tenant_isolation
  ON aioi_executive_queue_snapshot
  FOR ALL
  USING (impetus_tenant_row_visible(company_id))
  WITH CHECK (impetus_tenant_row_visible(company_id));

INSERT INTO tenant_rls_registry (table_name, tenant_column, enabled, policy_applied, notes)
VALUES (
  'aioi_executive_queue_snapshot',
  'company_id',
  true,
  true,
  'AIOI-ORG-5: Snapshot autoritativo da fila CEO — RLS ativado (ORG-1 AUTHORITATIVE)'
)
ON CONFLICT (table_name) DO UPDATE
  SET enabled        = true,
      policy_applied = true,
      notes          = EXCLUDED.notes,
      updated_at     = now();

-- Trigger updated_at (reutiliza aioi_set_updated_at se existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'aioi_set_updated_at') THEN
    DROP TRIGGER IF EXISTS trg_aioi_eqs_updated_at ON aioi_executive_queue_snapshot;
    CREATE TRIGGER trg_aioi_eqs_updated_at
      BEFORE UPDATE ON aioi_executive_queue_snapshot
      FOR EACH ROW
      EXECUTE FUNCTION aioi_set_updated_at();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- VERIFICAÇÃO
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl_exists BOOLEAN;
  rls_enabled BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'aioi_executive_queue_snapshot'
  ) INTO tbl_exists;

  SELECT relrowsecurity FROM pg_class
  WHERE relname = 'aioi_executive_queue_snapshot' INTO rls_enabled;

  IF NOT tbl_exists THEN
    RAISE EXCEPTION 'AIOI-ORG-5 FAIL: aioi_executive_queue_snapshot não criada';
  END IF;
  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'AIOI-ORG-5 FAIL: RLS não ativado em aioi_executive_queue_snapshot';
  END IF;

  RAISE NOTICE 'AIOI-ORG-5 PASS: snapshot=OK, RLS=ON, SLA columns=OK';
END $$;
