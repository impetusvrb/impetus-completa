-- =============================================================================
-- AIOI-P1.4 — Operational Persistence Hardening Layer
-- Fase:     AIOI-P1.4
-- Data:     2026-06-05
-- Modo:     ADDITIVE ONLY — sem alteração de tabelas ou serviços existentes
-- Spec:     backend/docs/AIOI_ANTI_DUPLICATION_POLICY.md (PERSIST-01..04)
-- DEPENDS ON: aioi_ioe_foundation_migration.sql
-- =============================================================================
-- Tabelas criadas:
--   aioi_audit_events
--   aioi_metrics_snapshots
--   aioi_processing_history
-- RLS: ENABLED + FORCED + policy _impetus_tenant_isolation em todas
-- Idempotente: CREATE TABLE IF NOT EXISTS / IF NOT EXISTS em todos os objetos.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PARTE 1 — Tabela: aioi_audit_events
-- Persistência imutável de eventos de auditoria AIOI.
-- PERSIST-01: UNIQUE(company_id, correlation_id, event_type)
-- PERSIST-02: ON CONFLICT DO NOTHING (aplicado nos serviços)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aioi_audit_events (

  id              UUID          NOT NULL DEFAULT gen_random_uuid(),
  company_id      UUID          NOT NULL,
  ioe_id          UUID          NULL,
  correlation_id  TEXT          NOT NULL,
  event_type      TEXT          NOT NULL,
  event_source    TEXT          NOT NULL,
  payload         JSONB         NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT pk_aioi_audit_events PRIMARY KEY (id),

  CONSTRAINT uq_aioi_audit_events_idempotency
    UNIQUE (company_id, correlation_id, event_type),

  CONSTRAINT chk_aioi_audit_event_type CHECK (event_type IN (
    'AIOI_PENDING_APPROVAL',
    'AIOI_APPROVED',
    'AIOI_REJECTED',
    'AIOI_EXECUTION_REQUESTED',
    'AIOI_EXECUTION_DELEGATED',
    'AIOI_OUTCOME_CAPTURED',
    'AIOI_LEARNING_SUBMITTED',
    'AIOI_LEARNING_PROCESSED',
    'AIOI_AUDIT_REQUESTED'
  )),

  CONSTRAINT chk_aioi_audit_correlation_not_empty CHECK (correlation_id <> ''),
  CONSTRAINT chk_aioi_audit_source_not_empty    CHECK (event_source <> '')
);

CREATE INDEX IF NOT EXISTS idx_aioi_audit_events_company
  ON aioi_audit_events (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_aioi_audit_events_ioe
  ON aioi_audit_events (company_id, ioe_id, created_at DESC)
  WHERE ioe_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_aioi_audit_events_correlation
  ON aioi_audit_events (correlation_id);

CREATE INDEX IF NOT EXISTS idx_aioi_audit_events_type
  ON aioi_audit_events (company_id, event_type, created_at DESC);

-- ---------------------------------------------------------------------------
-- PARTE 2 — Tabela: aioi_metrics_snapshots
-- Persistência histórica de métricas agregadas.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aioi_metrics_snapshots (

  id                UUID          NOT NULL DEFAULT gen_random_uuid(),
  company_id        UUID          NOT NULL,
  snapshot_type     TEXT          NOT NULL,
  snapshot_payload  JSONB         NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key   TEXT          NOT NULL,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT pk_aioi_metrics_snapshots PRIMARY KEY (id),

  CONSTRAINT uq_aioi_metrics_snapshots_idempotency
    UNIQUE (company_id, idempotency_key),

  CONSTRAINT chk_aioi_metrics_snapshot_type CHECK (snapshot_type IN (
    'lifecycle_snapshot',
    'cycle_kpis',
    'backlog_snapshot'
  )),

  CONSTRAINT chk_aioi_metrics_idempotency_not_empty CHECK (idempotency_key <> '')
);

CREATE INDEX IF NOT EXISTS idx_aioi_metrics_snapshots_company
  ON aioi_metrics_snapshots (company_id, snapshot_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_aioi_metrics_snapshots_type
  ON aioi_metrics_snapshots (company_id, snapshot_type, created_at DESC);

-- ---------------------------------------------------------------------------
-- PARTE 3 — Tabela: aioi_processing_history
-- Rastreio completo de transições do ciclo IOE.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aioi_processing_history (

  id              UUID          NOT NULL DEFAULT gen_random_uuid(),
  company_id      UUID          NOT NULL,
  ioe_id          UUID          NOT NULL,
  status_from     TEXT          NULL,
  status_to       TEXT          NOT NULL,
  source_layer    TEXT          NOT NULL,
  correlation_id  TEXT          NULL,
  idempotency_key TEXT          NOT NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT pk_aioi_processing_history PRIMARY KEY (id),

  CONSTRAINT uq_aioi_processing_history_idempotency
    UNIQUE (company_id, idempotency_key),

  CONSTRAINT chk_aioi_history_source_layer CHECK (source_layer IN (
    'adapter',
    'consumer',
    'decision',
    'approval',
    'execution',
    'outcome',
    'learning',
    'audit'
  )),

  CONSTRAINT chk_aioi_history_status_to_not_empty CHECK (status_to <> ''),
  CONSTRAINT chk_aioi_history_idempotency_not_empty CHECK (idempotency_key <> '')
);

CREATE INDEX IF NOT EXISTS idx_aioi_processing_history_ioe
  ON aioi_processing_history (company_id, ioe_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_aioi_processing_history_correlation
  ON aioi_processing_history (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_aioi_processing_history_layer
  ON aioi_processing_history (company_id, source_layer, created_at DESC);

-- ---------------------------------------------------------------------------
-- PARTE 4 — Row Level Security (todas as tabelas)
-- Mesma política de industrial_operational_events / aioi_outbox.
-- ---------------------------------------------------------------------------

-- aioi_audit_events
ALTER TABLE aioi_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE aioi_audit_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aioi_audit_events_impetus_tenant_isolation ON aioi_audit_events;

CREATE POLICY aioi_audit_events_impetus_tenant_isolation
  ON aioi_audit_events
  FOR ALL
  USING (impetus_tenant_row_visible(company_id))
  WITH CHECK (impetus_tenant_row_visible(company_id));

-- aioi_metrics_snapshots
ALTER TABLE aioi_metrics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE aioi_metrics_snapshots FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aioi_metrics_snapshots_impetus_tenant_isolation ON aioi_metrics_snapshots;

CREATE POLICY aioi_metrics_snapshots_impetus_tenant_isolation
  ON aioi_metrics_snapshots
  FOR ALL
  USING (impetus_tenant_row_visible(company_id))
  WITH CHECK (impetus_tenant_row_visible(company_id));

-- aioi_processing_history
ALTER TABLE aioi_processing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE aioi_processing_history FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aioi_processing_history_impetus_tenant_isolation ON aioi_processing_history;

CREATE POLICY aioi_processing_history_impetus_tenant_isolation
  ON aioi_processing_history
  FOR ALL
  USING (impetus_tenant_row_visible(company_id))
  WITH CHECK (impetus_tenant_row_visible(company_id));

-- ---------------------------------------------------------------------------
-- PARTE 5 — Registro no tenant_rls_registry
-- ---------------------------------------------------------------------------

INSERT INTO tenant_rls_registry (table_name, tenant_column, enabled, policy_applied, notes)
VALUES (
  'aioi_audit_events',
  'company_id',
  true,
  true,
  'AIOI-P1.4: Auditoria imutável de eventos AIOI — RLS ativado na migration de criação'
)
ON CONFLICT (table_name) DO UPDATE
  SET enabled        = true,
      policy_applied = true,
      notes          = EXCLUDED.notes,
      updated_at     = now();

INSERT INTO tenant_rls_registry (table_name, tenant_column, enabled, policy_applied, notes)
VALUES (
  'aioi_metrics_snapshots',
  'company_id',
  true,
  true,
  'AIOI-P1.4: Snapshots históricos de métricas AIOI — RLS ativado na migration de criação'
)
ON CONFLICT (table_name) DO UPDATE
  SET enabled        = true,
      policy_applied = true,
      notes          = EXCLUDED.notes,
      updated_at     = now();

INSERT INTO tenant_rls_registry (table_name, tenant_column, enabled, policy_applied, notes)
VALUES (
  'aioi_processing_history',
  'company_id',
  true,
  true,
  'AIOI-P1.4: Histórico de transições do ciclo IOE — RLS ativado na migration de criação'
)
ON CONFLICT (table_name) DO UPDATE
  SET enabled        = true,
      policy_applied = true,
      notes          = EXCLUDED.notes,
      updated_at     = now();

-- ---------------------------------------------------------------------------
-- VERIFICAÇÃO FINAL (não-destrutiva)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  audit_rls   BOOLEAN;
  metrics_rls BOOLEAN;
  history_rls BOOLEAN;
BEGIN
  SELECT relrowsecurity FROM pg_class WHERE relname = 'aioi_audit_events' INTO audit_rls;
  SELECT relrowsecurity FROM pg_class WHERE relname = 'aioi_metrics_snapshots' INTO metrics_rls;
  SELECT relrowsecurity FROM pg_class WHERE relname = 'aioi_processing_history' INTO history_rls;

  IF NOT audit_rls THEN
    RAISE EXCEPTION 'AIOI-P1.4 FAIL: RLS não ativado em aioi_audit_events';
  END IF;
  IF NOT metrics_rls THEN
    RAISE EXCEPTION 'AIOI-P1.4 FAIL: RLS não ativado em aioi_metrics_snapshots';
  END IF;
  IF NOT history_rls THEN
    RAISE EXCEPTION 'AIOI-P1.4 FAIL: RLS não ativado em aioi_processing_history';
  END IF;

  RAISE NOTICE 'AIOI-P1.4 PERSISTENCE PASS: 3 tabelas=OK, RLS=ON em todas';
END;
$$;

-- =============================================================================
-- Fim da migration: aioi_persistence_hardening_migration.sql
-- Tabelas criadas: aioi_audit_events, aioi_metrics_snapshots, aioi_processing_history
-- Nenhum serviço, worker, API ou comportamento existente foi alterado.
-- =============================================================================
