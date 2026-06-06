-- =============================================================================
-- AIOI-P0.1 — Foundation Layer: Industrial Operational Events (IOE)
-- Fase:     AIOI-P0.1 / AIOI-GOVERNANCE-01
-- Data:     2026-06-05
-- Modo:     ADDITIVE ONLY — sem alteração de tabelas existentes
-- Spec:     backend/docs/AIOI_IOE_SPECIFICATION.md
-- Auth:     backend/docs/AIOI_P0_AUTHORIZATION.md (P0_AUTHORIZED_WITH_RESTRICTIONS)
-- Restrição R4: RLS obrigatório antes de qualquer INSERT (migration atomica)
-- Restrição R6: UNIQUE(company_id, idempotency_key) obrigatório (anti-duplication DB3)
-- =============================================================================
-- Idempotente: CREATE TABLE IF NOT EXISTS / IF NOT EXISTS em todos os objetos.
-- Compatível com: tenantRlsRuntime, tenantRlsGovernanceService, tenantRlsFlags.
-- NÃO altera: nenhuma tabela, serviço, worker ou API existente.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PARTE 1 — Tabela principal: industrial_operational_events
-- ---------------------------------------------------------------------------
-- Entidade canônica do AIOI. Normaliza todo evento operacional industrial
-- (PLC, comunicação, OS, tarefa, MES, qualidade) antes da fila executiva.
-- Spec §2: Schema completo; §3: ENUMs; §5: Idempotência; §9: Multi-tenant.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS industrial_operational_events (

  -- -------------------------------------------------------------------------
  -- Identidade
  -- -------------------------------------------------------------------------
  id                    UUID          NOT NULL DEFAULT gen_random_uuid(),

  -- Multi-tenant: obrigatório, NOT NULL, base do RLS.
  -- Spec §9: company_id NOT NULL — RLS PostgreSQL obrigatório.
  company_id            UUID          NOT NULL,

  -- Chave de tenant redundante para RLS eficiente sem JOIN.
  -- Spec §9: sincronizado com company_id.
  tenant_key            TEXT          NOT NULL,

  -- -------------------------------------------------------------------------
  -- Rastreabilidade e Idempotência
  -- -------------------------------------------------------------------------

  -- Chave de idempotência por tenant.
  -- Spec §5: formato '{source_type}:{entity_type}:{entity_id}:{bucket_hora}'.
  -- ANTI_DUPLICATION_POLICY §2 risco R-E2 + risco DB3: UNIQUE obrigatório.
  -- Restrição R6 do P0_AUTHORIZATION: gate antes de produção.
  idempotency_key       TEXT          NOT NULL,

  -- Liga o IOE ao envelope W2 (industrialEventBackbone) e ao workflow.
  -- Spec §4: formato 'ioe-{uuid}' ou herdar de W2 correlation_id.
  -- BUS_ARCHITECTURE §3.1: correlation_id compartilhado entre aioi_outbox e W2.
  correlation_id        TEXT          NOT NULL,

  -- ID do registro na fonte original (ex.: plc_collected_data.id, work_orders.id).
  external_ref_id       TEXT          NULL,

  -- -------------------------------------------------------------------------
  -- Classificação de Origem e Domínio
  -- -------------------------------------------------------------------------

  -- Origem do evento.
  -- Spec §3.1: valores canônicos do source_type ENUM.
  source_type           TEXT          NOT NULL,

  -- Categoria operacional.
  -- Spec §3.2: valores canônicos do category ENUM.
  category              TEXT          NOT NULL,

  -- -------------------------------------------------------------------------
  -- Estado e Ciclo de Vida
  -- -------------------------------------------------------------------------

  -- Estado do IOE. Default: 'open' (aguardando triagem).
  -- Spec §3.3: transições válidas documentadas.
  status                TEXT          NOT NULL DEFAULT 'open',

  -- Estado de verdade do score.
  -- Spec §3.5 + Contratos Truth TC-01..TC-07.
  -- industrialTruthEnforcementService é soberano; IOE apenas qualifica.
  truth_state           TEXT          NOT NULL DEFAULT 'provisional',

  -- Banda de prioridade derivada de priority_score via priorityLevelFromScore().
  -- Spec §3.4. PROIBIDO definir manualmente sem calcular priority_score.
  -- ANTI_DUPLICATION_POLICY §2 contrato P-02.
  priority_band         TEXT          NOT NULL DEFAULT 'low',

  -- Score 0–100 produzido por operationalPrioritizationService.computePriorityScore().
  -- SOVEREIGNTY_MAP: soberano = operationalPrioritizationService.
  -- ANTI_DUPLICATION_POLICY §2 contratos P-01/P-04: proibido recalcular aqui.
  priority_score        SMALLINT      NOT NULL DEFAULT 0,

  -- Flag: true enquanto truth_state != 'grounded'.
  -- Spec §7 / Contrato TC-02 e TC-05.
  scores_provisional    BOOLEAN       NOT NULL DEFAULT true,

  -- -------------------------------------------------------------------------
  -- Componentes de Scoring (F47/F44/F45 decompostos)
  -- Populados pelo adapter PLC ao consumir operationalPrioritizationService.
  -- Spec §7. NÃO calculados nesta camada — apenas armazenados.
  -- -------------------------------------------------------------------------
  score_attention       SMALLINT      NULL CHECK (score_attention IS NULL OR (score_attention >= 0 AND score_attention <= 100)),
  score_risk            SMALLINT      NULL CHECK (score_risk IS NULL OR (score_risk >= 0 AND score_risk <= 100)),
  score_event_conf      SMALLINT      NULL CHECK (score_event_conf IS NULL OR (score_event_conf >= 0 AND score_event_conf <= 100)),
  score_pattern_conf    SMALLINT      NULL CHECK (score_pattern_conf IS NULL OR (score_pattern_conf >= 0 AND score_pattern_conf <= 100)),
  score_telemetry_hlth  SMALLINT      NULL CHECK (score_telemetry_hlth IS NULL OR (score_telemetry_hlth >= 0 AND score_telemetry_hlth <= 100)),
  classification_conf   SMALLINT      NULL CHECK (classification_conf IS NULL OR (classification_conf >= 0 AND classification_conf <= 100)),

  -- -------------------------------------------------------------------------
  -- Entidade Operacional
  -- -------------------------------------------------------------------------

  -- Tipo da entidade referenciada.
  entity_type           TEXT          NOT NULL,

  -- FK dinâmica: UUID da entidade conforme entity_type.
  -- Sem FK formal (entity_type varia); adapter valida antes de INSERT.
  entity_id             UUID          NULL,

  -- Desnormalizado para performance de queries na fila executiva.
  -- FK lógica: machine_monitoring_config.id (ou assets.id).
  equipment_id          UUID          NULL,

  -- FK lógica: company_sectors.id (via organizationalIdentityEngine).
  sector_id             UUID          NULL,

  -- FK lógica: departments.id (via organizationalIdentityEngine).
  department_id         UUID          NULL,

  -- -------------------------------------------------------------------------
  -- Ownership e Escalonamento
  -- SOVEREIGNTY_MAP: soberano de identity = organizationalIdentityEngine.
  -- -------------------------------------------------------------------------

  -- FK: company_roles.id (organizationalIdentityEngine.assertRoleBelongs).
  -- Pode ser NULL quando IOE ainda não foi classificado e atribuído.
  assigned_role_id      UUID          NULL,

  -- Espelho de company_roles.hierarchy_level para queries sem JOIN.
  -- Valores 0–5 (Presidência→Operacional); 6–8 reservados P2+.
  hierarchy_level       SMALLINT      NULL CHECK (hierarchy_level IS NULL OR (hierarchy_level >= 0 AND hierarchy_level <= 8)),

  -- Define qual dashboard/audiência recebe o IOE.
  -- Spec §3.6. 'board' e 'investor' reservados (P2+).
  audience_key          TEXT          NOT NULL DEFAULT 'ceo',

  -- Contador de escalonamentos do IOE.
  escalation_level      SMALLINT      NOT NULL DEFAULT 0,

  -- -------------------------------------------------------------------------
  -- Isolamento Multi-Tenant
  -- -------------------------------------------------------------------------

  -- Escopo de visibilidade entre plantas/empresas.
  -- 'holding' reservado P2+.
  visibility_scope      TEXT          NOT NULL DEFAULT 'company',

  -- -------------------------------------------------------------------------
  -- Evidências Estruturadas
  -- Spec §6: array de {type, ref_id, source_table, confidence, summary}.
  -- Inclui packs F44/F45/F47/F43; preenchido pelo adapter, não pela migration.
  -- -------------------------------------------------------------------------
  evidence_refs         JSONB         NOT NULL DEFAULT '[]'::jsonb,

  -- -------------------------------------------------------------------------
  -- Decisão Operacional
  -- SOVEREIGNTY_MAP: execução = actionRuntimeOrchestrator (REUSE).
  -- SOVEREIGNTY_MAP: workflow = workflowOrchestrator (REUSE).
  -- Estes campos armazenam referências; NÃO executam nada.
  -- -------------------------------------------------------------------------

  -- Tipo de decisão tomada pelo AIOI Decision Engine (P0+).
  -- Spec §3.7. NULL = IOE aberto sem decisão atribuída.
  decision_type         TEXT          NULL,

  -- Payload para actionRuntimeOrchestrator ou workflowOrchestrator.
  decision_payload      JSONB         NULL,

  -- HITL: usuário que aprovou a decisão (actionRuntimeOrchestrator).
  approved_by_user_id   UUID          NULL,
  approved_at           TIMESTAMPTZ   NULL,

  -- -------------------------------------------------------------------------
  -- KPI Snapshot
  -- Spec §13 Contrato TC-04: oee=null quando truth_state='telemetry_only'.
  -- mesErpIntegrationService é soberano dos KPI MES.
  -- -------------------------------------------------------------------------
  -- { oee: null|float, mtbf: null|float, mttr: null|float,
  --   source: 'mes'|'estimated'|'unavailable' }
  kpi_snapshot          JSONB         NULL,

  -- -------------------------------------------------------------------------
  -- Execução (referências — campos de rastreabilidade)
  -- Populados após execução via actionRuntimeOrchestrator / workflowOrchestrator.
  -- -------------------------------------------------------------------------

  -- FK lógica: action_execution_traces.trace_id (actionRuntimeOrchestrator).
  execution_trace_id    UUID          NULL,

  -- FK lógica: industrial_workflow_instances.id (workflowOrchestrator).
  workflow_instance_id  UUID          NULL,

  resolved_at           TIMESTAMPTZ   NULL,
  resolution_notes      TEXT          NULL,

  -- -------------------------------------------------------------------------
  -- Metadados do Adapter
  -- -------------------------------------------------------------------------

  -- Payload original da fonte (truncado a 64KB pelo adapter — Spec §4 risco T4).
  raw_payload           JSONB         NULL,

  -- Versão semântica do adapter que gerou o IOE.
  adapter_version       TEXT          NULL,

  -- Versão do engine AIOI que processou o IOE.
  aioi_version          TEXT          NULL,

  -- -------------------------------------------------------------------------
  -- Timestamps
  -- -------------------------------------------------------------------------
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- TTL para governance de retenção (AIOI_STRUCTURAL_READINESS §1.9).
  expires_at            TIMESTAMPTZ   NULL,

  -- -------------------------------------------------------------------------
  -- Chave primária
  -- -------------------------------------------------------------------------
  CONSTRAINT pk_industrial_operational_events PRIMARY KEY (id),

  -- -------------------------------------------------------------------------
  -- IDEMPOTÊNCIA OBRIGATÓRIA — Restrição R6 / P0_AUTHORIZATION
  -- ANTI_DUPLICATION_POLICY §3 Risco DB3 (HIGH): duplicata idempotency_key.
  -- Garante que o mesmo evento da mesma empresa não seja inserido duas vezes.
  -- Adapters devem usar ON CONFLICT (company_id, idempotency_key) DO NOTHING.
  -- -------------------------------------------------------------------------
  CONSTRAINT uq_ioe_idempotency UNIQUE (company_id, idempotency_key),

  -- -------------------------------------------------------------------------
  -- Constraints de domínio — garantem integridade dos ENUMs sem tipo PG
  -- (padrão IMPETUS: TEXT + CHECK, sem ALTER TYPE em produção).
  -- -------------------------------------------------------------------------

  -- source_type: Spec §3.1
  CONSTRAINT chk_ioe_source_type CHECK (source_type IN (
    'plc_telemetry',
    'plc_pattern',
    'plc_event',
    'communication',
    'work_order',
    'task',
    'mes_erp',
    'quality_nc',
    'safety_event',
    'environmental',
    'manual',
    'cognitive_ingestion'
  )),

  -- category: Spec §3.2
  CONSTRAINT chk_ioe_category CHECK (category IN (
    'equipment_failure',
    'equipment_degradation',
    'production_deviation',
    'quality_issue',
    'safety_incident',
    'maintenance_required',
    'communication_risk',
    'task_overdue',
    'environmental_alert',
    'kpi_deviation',
    'system_event'
  )),

  -- status: Spec §3.3
  CONSTRAINT chk_ioe_status CHECK (status IN (
    'open',
    'triaged',
    'pending_approval',
    'approved',
    'rejected',
    'in_progress',
    'escalated',
    'resolved',
    'auto_closed',
    'closed'
  )),

  -- priority_band: Spec §3.4
  -- SOBERANIA: derivado de operationalPrioritizationService.priorityLevelFromScore().
  CONSTRAINT chk_ioe_priority_band CHECK (priority_band IN (
    'critical',
    'high',
    'medium',
    'low'
  )),

  -- priority_score: Spec §7 — 0 a 100.
  -- SOBERANIA: calculado por operationalPrioritizationService.computePriorityScore().
  CONSTRAINT chk_ioe_priority_score CHECK (priority_score >= 0 AND priority_score <= 100),

  -- truth_state: Spec §3.5
  -- SOBERANIA: industrialTruthEnforcementService valida afirmações sobre o IOE.
  CONSTRAINT chk_ioe_truth_state CHECK (truth_state IN (
    'grounded',
    'provisional',
    'telemetry_only',
    'manual_override',
    'insufficient_data'
  )),

  -- audience_key: Spec §3.6
  CONSTRAINT chk_ioe_audience_key CHECK (audience_key IN (
    'ceo',
    'operational',
    'board',
    'investor'
  )),

  -- decision_type: Spec §3.7
  -- SOBERANIA: workflow = workflowOrchestrator; direct_action = actionRuntimeOrchestrator.
  CONSTRAINT chk_ioe_decision_type CHECK (decision_type IS NULL OR decision_type IN (
    'workflow',
    'direct_action',
    'suggest_only',
    'escalate'
  )),

  -- entity_type: valores canônicos
  CONSTRAINT chk_ioe_entity_type CHECK (entity_type IN (
    'equipment',
    'line',
    'sector',
    'company',
    'task',
    'communication'
  )),

  -- visibility_scope: P0 = 'company'; 'holding' reservado P2+
  CONSTRAINT chk_ioe_visibility_scope CHECK (visibility_scope IN (
    'plant',
    'company',
    'holding'
  )),

  -- Segurança tenant: company_id e correlation_id não podem ser vazios
  CONSTRAINT chk_ioe_company_id_not_empty    CHECK (company_id IS NOT NULL),
  CONSTRAINT chk_ioe_correlation_not_empty   CHECK (correlation_id <> ''),
  CONSTRAINT chk_ioe_idempotency_not_empty   CHECK (idempotency_key <> ''),
  CONSTRAINT chk_ioe_tenant_key_not_empty    CHECK (tenant_key <> '')

);

-- ---------------------------------------------------------------------------
-- PARTE 2 — Índices de Performance
-- Spec §10: índices recomendados.
-- ---------------------------------------------------------------------------

-- Fila executiva (query principal da UI CEO).
-- Spec §10: idx_ioe_queue — filtra IOEs ativos por empresa ordenados por prioridade.
CREATE INDEX IF NOT EXISTS idx_ioe_queue
  ON industrial_operational_events (company_id, status, priority_score DESC, created_at DESC)
  WHERE status IN ('open', 'triaged', 'pending_approval');

-- Busca por equipamento (adapter PLC / dashboard drill-down).
-- Spec §10: idx_ioe_equipment.
CREATE INDEX IF NOT EXISTS idx_ioe_equipment
  ON industrial_operational_events (company_id, equipment_id, created_at DESC)
  WHERE equipment_id IS NOT NULL;

-- Rastreabilidade cross-domínio: IOE → W2 envelope → workflow → trace.
-- Spec §4 e §12. BUS_ARCHITECTURE §3.1: correlation_id compartilhado.
CREATE INDEX IF NOT EXISTS idx_ioe_correlation
  ON industrial_operational_events (correlation_id);

-- Governança de retenção (TTL: expires_at).
-- Spec §10: idx_ioe_expires.
CREATE INDEX IF NOT EXISTS idx_ioe_expires
  ON industrial_operational_events (expires_at ASC)
  WHERE expires_at IS NOT NULL;

-- UI: indicadores de confiança Truth (truth_state + status por empresa).
-- Spec §10: idx_ioe_truth_status.
CREATE INDEX IF NOT EXISTS idx_ioe_truth_status
  ON industrial_operational_events (company_id, truth_state, status);

-- Escalonamento: busca por role responsável.
CREATE INDEX IF NOT EXISTS idx_ioe_assigned_role
  ON industrial_operational_events (company_id, assigned_role_id, status)
  WHERE assigned_role_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- PARTE 3 — Row Level Security (RLS)
-- Restrição R4 do P0_AUTHORIZATION: RLS obrigatório antes de qualquer INSERT.
-- Compatível com: tenantRlsRuntime (impetus_tenant_row_visible),
--                 tenantRlsGovernanceService, tenantRlsFlags.
-- ANTI_DUPLICATION_POLICY §3 Risco R-T3/M1 (CRITICAL): leakage tenant.
-- ---------------------------------------------------------------------------

-- Ativar RLS na tabela.
ALTER TABLE industrial_operational_events ENABLE ROW LEVEL SECURITY;

-- FORCE: garante que mesmo o owner da conexão seja filtrado pelo RLS.
ALTER TABLE industrial_operational_events FORCE ROW LEVEL SECURITY;

-- Política de isolamento de tenant.
-- Nome segue convenção do tenantRlsRuntime: '{tabela}_impetus_tenant_isolation'.
-- impetus_tenant_row_visible(company_id): definida em enterprise_rls_migration.sql.
-- Lê app.current_company_id da sessão PostgreSQL (definido por tenantRlsRuntime.js).
DROP POLICY IF EXISTS industrial_operational_events_impetus_tenant_isolation
  ON industrial_operational_events;

CREATE POLICY industrial_operational_events_impetus_tenant_isolation
  ON industrial_operational_events
  FOR ALL
  USING (impetus_tenant_row_visible(company_id))
  WITH CHECK (impetus_tenant_row_visible(company_id));

-- ---------------------------------------------------------------------------
-- PARTE 4 — Registro no tenant_rls_registry
-- Segue o padrão do tenantRlsRuntime e enterprise_rls_migration.sql.
-- Registra a tabela no catálogo de RLS do IMPETUS.
-- policy_applied=true: política já foi criada acima nesta migration.
-- enabled=true: RLS ativo imediatamente (tabela nova, sem dados existentes).
-- ---------------------------------------------------------------------------
INSERT INTO tenant_rls_registry (table_name, tenant_column, enabled, policy_applied, notes)
VALUES (
  'industrial_operational_events',
  'company_id',
  true,
  true,
  'AIOI-P0.1: IOE canônico do AIOI — RLS ativado na migration de criação (R4 P0_AUTHORIZATION)'
)
ON CONFLICT (table_name) DO UPDATE
  SET enabled        = true,
      policy_applied = true,
      notes          = EXCLUDED.notes,
      updated_at     = now();

-- ---------------------------------------------------------------------------
-- PARTE 5 — Trigger: atualização automática de updated_at
-- Padrão IMPETUS: trigger updated_at em todas as tabelas auditáveis.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION aioi_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ioe_updated_at ON industrial_operational_events;

CREATE TRIGGER trg_ioe_updated_at
  BEFORE UPDATE ON industrial_operational_events
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
      AND table_name = 'industrial_operational_events'
  ) INTO tbl_exists;

  SELECT relrowsecurity
    FROM pg_class
   WHERE relname = 'industrial_operational_events'
  INTO rls_enabled;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'industrial_operational_events'
      AND constraint_name = 'uq_ioe_idempotency'
      AND constraint_type = 'UNIQUE'
  ) INTO uniq_exists;

  IF NOT tbl_exists THEN
    RAISE EXCEPTION 'AIOI-P0.1 FAIL: tabela industrial_operational_events não criada';
  END IF;
  IF NOT rls_enabled THEN
    RAISE EXCEPTION 'AIOI-P0.1 FAIL: RLS não ativado em industrial_operational_events';
  END IF;
  IF NOT uniq_exists THEN
    RAISE EXCEPTION 'AIOI-P0.1 FAIL: UNIQUE(company_id, idempotency_key) não criado';
  END IF;

  RAISE NOTICE 'AIOI-P0.1 IOE PASS: tabela=OK, RLS=ON, UNIQUE=OK';
END;
$$;

-- =============================================================================
-- Fim da migration: aioi_ioe_foundation_migration.sql
-- Tabelas criadas: industrial_operational_events
-- RLS: ENABLED + FORCED + policy _impetus_tenant_isolation
-- Idempotência: UNIQUE(company_id, idempotency_key)
-- Nenhum serviço, worker, API ou comportamento existente foi alterado.
-- =============================================================================
