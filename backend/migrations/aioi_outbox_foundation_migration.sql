-- =============================================================================
-- AIOI-P0.1 — Foundation Layer: AIOI Outbox (Barramento Transacional P0)
-- Fase:     AIOI-P0.1 / AIOI-GOVERNANCE-01
-- Data:     2026-06-05
-- Modo:     ADDITIVE ONLY — sem alteração de tabelas existentes
-- Spec:     backend/docs/AIOI_BUS_ARCHITECTURE.md §5
-- Auth:     backend/docs/AIOI_P0_AUTHORIZATION.md (P0_AUTHORIZED_WITH_RESTRICTIONS)
-- Restrição R5: RLS obrigatório em aioi_outbox antes de qualquer INSERT.
-- =============================================================================
-- DECISÃO OFICIAL (BUS_ARCHITECTURE §1):
--   P0 = PostgreSQL Outbox (aioi_outbox) como mecanismo soberano.
--   Kafka = NÃO; RabbitMQ = NÃO; Redis = NÃO.
-- =============================================================================
-- Compatibilidade (BUS_ARCHITECTURE §3):
--   Coexiste com industrial_event_outbox (W2) — domínios distintos.
--   Compartilha correlation_id com W2 envelope para bridge bidirecional.
--   Não altera industrial_event_outbox nem qualquer tabela existente.
-- =============================================================================
-- Idempotente: CREATE TABLE IF NOT EXISTS / IF NOT EXISTS em todos os objetos.
-- DEPENDS ON: aioi_ioe_foundation_migration.sql (industrial_operational_events).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PARTE 1 — Tabela: aioi_outbox
-- BUS_ARCHITECTURE §5: schema especificado.
-- BUS_ARCHITECTURE §7: mecanismo soberano AIOI-P0.
-- ---------------------------------------------------------------------------
-- O outbox é inserido atomicamente junto com o IOE (BEGIN TX).
-- Worker (P0: setInterval; P1: PM2 dedicado) lê com FOR UPDATE SKIP LOCKED.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS aioi_outbox (

  -- -------------------------------------------------------------------------
  -- Identidade
  -- -------------------------------------------------------------------------
  id                UUID          NOT NULL DEFAULT gen_random_uuid(),

  -- Multi-tenant: obrigatório, NOT NULL, base do RLS.
  -- Restrição R5 do P0_AUTHORIZATION + ANTI_DUPLICATION risco M1/R-T3.
  company_id        UUID          NOT NULL,

  -- FK lógica para o IOE que gerou esta entrada de outbox.
  -- Referência a industrial_operational_events.id.
  -- FK formal omitida para permitir insert atômico na mesma transação
  -- sem dependência de ordem — adapter faz INSERT IOE + INSERT outbox em TX.
  ioe_id            UUID          NOT NULL,

  -- -------------------------------------------------------------------------
  -- Tipo de Consumer
  -- BUS_ARCHITECTURE §4: consumers ClassificationConsumer, PriorityConsumer,
  --   QueueConsumer, BridgeConsumer.
  -- -------------------------------------------------------------------------
  consumer_type     TEXT          NOT NULL,

  -- -------------------------------------------------------------------------
  -- Estado de Processamento
  -- BUS_ARCHITECTURE §7: status pending→processing→delivered|failed.
  -- DLQ: attempts > 3 + status='failed' → fila morta.
  -- -------------------------------------------------------------------------
  status            TEXT          NOT NULL DEFAULT 'pending',

  -- -------------------------------------------------------------------------
  -- Idempotência do Outbox
  -- BUS_ARCHITECTURE §7: 'UNIQUE idempotency_key' — sem processamento duplo.
  -- Formato: '{consumer_type}:{ioe_id}' garante unicidade por consumer.
  -- -------------------------------------------------------------------------
  idempotency_key   TEXT          NOT NULL,

  -- -------------------------------------------------------------------------
  -- Payload
  -- Dados necessários para o consumer processar sem reler o IOE.
  -- Truncado se necessário; consumer pode buscar IOE completo por ioe_id.
  -- -------------------------------------------------------------------------
  payload           JSONB         NOT NULL DEFAULT '{}'::jsonb,

  -- -------------------------------------------------------------------------
  -- Controle de Retry / DLQ
  -- BUS_ARCHITECTURE §7: DLQ = status='failed' + attempts > 3.
  -- -------------------------------------------------------------------------
  attempts          SMALLINT      NOT NULL DEFAULT 0,
  last_error        TEXT          NULL,

  -- Controla o próximo ciclo de retry (backoff exponencial pelo worker).
  -- Padrão W1 (industrial_event_outbox): next_attempt_at.
  next_attempt_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- -------------------------------------------------------------------------
  -- Rastreabilidade
  -- BUS_ARCHITECTURE §3.1: correlation_id compartilhado com W2 envelope.
  -- Spec IOE §4: correlation_id propagado IOE → outbox → W2 → workflow.
  -- -------------------------------------------------------------------------
  correlation_id    TEXT          NOT NULL,

  -- -------------------------------------------------------------------------
  -- Timestamps
  -- -------------------------------------------------------------------------
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ   NULL,

  -- -------------------------------------------------------------------------
  -- Chave primária
  -- -------------------------------------------------------------------------
  CONSTRAINT pk_aioi_outbox PRIMARY KEY (id),

  -- -------------------------------------------------------------------------
  -- Idempotência global do outbox.
  -- Previne que o mesmo consumer processe o mesmo IOE duas vezes.
  -- BUS_ARCHITECTURE §7: "Idempotência = UNIQUE idempotency_key".
  -- -------------------------------------------------------------------------
  CONSTRAINT uq_aioi_outbox_idempotency UNIQUE (idempotency_key),

  -- -------------------------------------------------------------------------
  -- Constraints de domínio
  -- -------------------------------------------------------------------------

  -- consumer_type: consumers definidos na BUS_ARCHITECTURE §4.
  CONSTRAINT chk_aioi_outbox_consumer_type CHECK (consumer_type IN (
    'classification',
    'priority',
    'queue',
    'bridge'
  )),

  -- status: ciclo de vida do outbox.
  CONSTRAINT chk_aioi_outbox_status CHECK (status IN (
    'pending',
    'processing',
    'delivered',
    'failed'
  )),

  -- attempts: não negativo; DLQ acima de 3 (worker decide, não constraint).
  CONSTRAINT chk_aioi_outbox_attempts CHECK (attempts >= 0),

  -- Segurança tenant: company_id obrigatório, campos de rastreabilidade não vazios.
  CONSTRAINT chk_aioi_outbox_company_not_null       CHECK (company_id IS NOT NULL),
  CONSTRAINT chk_aioi_outbox_correlation_not_empty  CHECK (correlation_id <> ''),
  CONSTRAINT chk_aioi_outbox_idempotency_not_empty  CHECK (idempotency_key <> ''),
  CONSTRAINT chk_aioi_outbox_ioe_id_not_null        CHECK (ioe_id IS NOT NULL)

);

-- ---------------------------------------------------------------------------
-- PARTE 2 — Índices de Performance
-- BUS_ARCHITECTURE §5: índices recomendados.
-- ---------------------------------------------------------------------------

-- Principal: worker lê pending em ordem FIFO por empresa.
-- BUS_ARCHITECTURE §7: "Ordenação = created_at ASC por tenant — FIFO".
-- Worker usa FOR UPDATE SKIP LOCKED com este índice.
CREATE INDEX IF NOT EXISTS idx_aioi_outbox_pending
  ON aioi_outbox (company_id, status, next_attempt_at ASC, created_at ASC)
  WHERE status = 'pending';

-- Processamento: worker marca rows em processing para evitar double-pick.
CREATE INDEX IF NOT EXISTS idx_aioi_outbox_processing
  ON aioi_outbox (company_id, status, updated_at ASC)
  WHERE status = 'processing';

-- DLQ: monitoramento de falhas por tenant.
-- BUS_ARCHITECTURE §7: "DLQ = status='failed' + attempts > 3".
CREATE INDEX IF NOT EXISTS idx_aioi_outbox_failed
  ON aioi_outbox (company_id, created_at DESC)
  WHERE status = 'failed';

-- Rastreabilidade: lookup por ioe_id (consumer busca outbox de um IOE).
CREATE INDEX IF NOT EXISTS idx_aioi_outbox_ioe_id
  ON aioi_outbox (ioe_id);

-- Rastreabilidade: lookup por correlation_id (debug e bridge W2).
-- BUS_ARCHITECTURE §3.1: correlation_id compartilhado.
CREATE INDEX IF NOT EXISTS idx_aioi_outbox_correlation
  ON aioi_outbox (correlation_id);

-- Observabilidade: lag metric por empresa.
-- BUS_ARCHITECTURE §7: "SELECT COUNT(*) WHERE status='pending'" = métrica de lag.
CREATE INDEX IF NOT EXISTS idx_aioi_outbox_lag_metric
  ON aioi_outbox (company_id, status)
  WHERE status IN ('pending', 'processing');

-- ---------------------------------------------------------------------------
-- PARTE 3 — Row Level Security (RLS)
-- Restrição R5 do P0_AUTHORIZATION: RLS obrigatório antes de qualquer INSERT.
-- Compatível com: tenantRlsRuntime (impetus_tenant_row_visible),
--                 tenantRlsGovernanceService, tenantRlsFlags.
-- ANTI_DUPLICATION_POLICY §3 Risco R-T3/M1 (CRITICAL): leakage tenant.
-- ---------------------------------------------------------------------------

-- Ativar RLS na tabela.
ALTER TABLE aioi_outbox ENABLE ROW LEVEL SECURITY;

-- FORCE: garante que mesmo o owner da conexão seja filtrado.
ALTER TABLE aioi_outbox FORCE ROW LEVEL SECURITY;

-- Política de isolamento de tenant.
-- Nome segue convenção do tenantRlsRuntime: '{tabela}_impetus_tenant_isolation'.
-- impetus_tenant_row_visible(company_id): definida em enterprise_rls_migration.sql.
DROP POLICY IF EXISTS aioi_outbox_impetus_tenant_isolation ON aioi_outbox;

CREATE POLICY aioi_outbox_impetus_tenant_isolation
  ON aioi_outbox
  FOR ALL
  USING (impetus_tenant_row_visible(company_id))
  WITH CHECK (impetus_tenant_row_visible(company_id));

-- ---------------------------------------------------------------------------
-- PARTE 4 — Registro no tenant_rls_registry
-- Segue o padrão do tenantRlsRuntime e enterprise_rls_migration.sql.
-- ---------------------------------------------------------------------------
INSERT INTO tenant_rls_registry (table_name, tenant_column, enabled, policy_applied, notes)
VALUES (
  'aioi_outbox',
  'company_id',
  true,
  true,
  'AIOI-P0.1: Outbox transacional AIOI (PostgreSQL Outbox soberano P0) — RLS ativado na migration de criação (R5 P0_AUTHORIZATION)'
)
ON CONFLICT (table_name) DO UPDATE
  SET enabled        = true,
      policy_applied = true,
      notes          = EXCLUDED.notes,
      updated_at     = now();

-- ---------------------------------------------------------------------------
-- PARTE 5 — Trigger: atualização automática de updated_at
-- Reutiliza função aioi_set_updated_at() criada pela migration IOE.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_aioi_outbox_updated_at ON aioi_outbox;

CREATE TRIGGER trg_aioi_outbox_updated_at
  BEFORE UPDATE ON aioi_outbox
  FOR EACH ROW
  EXECUTE FUNCTION aioi_set_updated_at();

-- ---------------------------------------------------------------------------
-- VERIFICAÇÃO FINAL (não-destrutiva, somente SELECT)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  tbl_exists  BOOLEAN;
  rls_enabled BOOLEAN;
  uniq_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'aioi_outbox'
  ) INTO tbl_exists;

  SELECT relrowsecurity
    FROM pg_class
   WHERE relname = 'aioi_outbox'
  INTO rls_enabled;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'aioi_outbox'
      AND constraint_name = 'uq_aioi_outbox_idempotency'
      AND constraint_type = 'UNIQUE'
  ) INTO uniq_exists;

  IF NOT tbl_exists THEN
    RAISE EXCEPTION 'AIOI-P0.1 FAIL: tabela aioi_outbox não criada';
  END IF;
  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'AIOI-P0.1 FAIL: RLS não ativado em aioi_outbox';
  END IF;
  IF NOT uniq_exists THEN
    RAISE EXCEPTION 'AIOI-P0.1 FAIL: UNIQUE(idempotency_key) não criado em aioi_outbox';
  END IF;

  RAISE NOTICE 'AIOI-P0.1 OUTBOX PASS: tabela=OK, RLS=ON, UNIQUE=OK';
END;
$$;

-- =============================================================================
-- Fim da migration: aioi_outbox_foundation_migration.sql
-- Tabelas criadas: aioi_outbox
-- RLS: ENABLED + FORCED + policy _impetus_tenant_isolation
-- Idempotência: UNIQUE(idempotency_key) + consumer_type
-- Nenhum worker, consumer, API ou comportamento existente foi alterado.
-- =============================================================================
