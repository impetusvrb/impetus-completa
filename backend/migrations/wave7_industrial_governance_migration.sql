-- ============================================================
-- WAVE 7 — Industrial Governance Migration
-- Aditivo: apenas CREATE TABLE IF NOT EXISTS
-- Não altera tabelas existentes.
-- ============================================================

-- 1. Industrial Audit Events (append-only por convenção de aplicação)
CREATE TABLE IF NOT EXISTS industrial_audit_events (
    id                 VARCHAR(64)  PRIMARY KEY,
    event_type         VARCHAR(128) NOT NULL,
    domain             VARCHAR(64)  NOT NULL,
    workflow_id        VARCHAR(128),
    actor_id           VARCHAR(128),
    actor_role         VARCHAR(64),
    company_id         UUID,
    traceability_id    VARCHAR(64),
    payload            JSONB,
    severity           VARCHAR(16)  NOT NULL DEFAULT 'info',
    recorded_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_industrial_audit_events_company
    ON industrial_audit_events(company_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_industrial_audit_events_domain
    ON industrial_audit_events(domain, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_industrial_audit_events_workflow
    ON industrial_audit_events(workflow_id) WHERE workflow_id IS NOT NULL;

-- 2. Immutable Workflow Audit (ledger com hash chain)
CREATE TABLE IF NOT EXISTS immutable_workflow_audit (
    sequence_nr        BIGSERIAL    PRIMARY KEY,
    workflow_id        VARCHAR(128) NOT NULL,
    workflow_type      VARCHAR(128) NOT NULL,
    actor_id           VARCHAR(128),
    actor_role         VARCHAR(64),
    company_id         UUID,
    domain             VARCHAR(64)  NOT NULL,
    action             VARCHAR(128) NOT NULL,
    payload            JSONB,
    previous_hash      VARCHAR(64)  NOT NULL,
    record_hash        VARCHAR(64)  NOT NULL UNIQUE,
    recorded_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_immutable_workflow_audit_workflow
    ON immutable_workflow_audit(workflow_id, sequence_nr DESC);
CREATE INDEX IF NOT EXISTS idx_immutable_workflow_audit_company
    ON immutable_workflow_audit(company_id, sequence_nr DESC);

-- Comentário: impede DELETE/UPDATE via comment para documentar intenção.
COMMENT ON TABLE immutable_workflow_audit IS
    'Ledger append-only de auditoria de workflows. Proibir DELETE/UPDATE via política de BD quando disponível.';

-- 3. Industrial Traceability Chain
CREATE TABLE IF NOT EXISTS industrial_traceability_chain (
    id                 BIGSERIAL    PRIMARY KEY,
    traceability_id    VARCHAR(64)  NOT NULL UNIQUE,
    workflow_id        VARCHAR(128) NOT NULL,
    domain             VARCHAR(64)  NOT NULL,
    actor_id           VARCHAR(128),
    actor_role         VARCHAR(64),
    company_id         UUID,
    action             VARCHAR(128) NOT NULL,
    resource_type      VARCHAR(64),
    resource_id        VARCHAR(128),
    metadata           JSONB,
    recorded_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_industrial_traceability_workflow
    ON industrial_traceability_chain(workflow_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_industrial_traceability_company
    ON industrial_traceability_chain(company_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_industrial_traceability_domain
    ON industrial_traceability_chain(domain, recorded_at DESC);

-- 4. LGPD Data Classification Registry (seed gerido pela aplicação)
CREATE TABLE IF NOT EXISTS industrial_lgpd_classification (
    id                 SERIAL       PRIMARY KEY,
    field_path         VARCHAR(256) NOT NULL UNIQUE,
    category           VARCHAR(32)  NOT NULL,
    description        TEXT,
    retention_days     INTEGER      NOT NULL DEFAULT 1825,
    anonymization_req  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 5. Workflow Permission Audit Log (observe-mode; registo de verificações)
CREATE TABLE IF NOT EXISTS workflow_permission_audit_log (
    id                 BIGSERIAL    PRIMARY KEY,
    workflow_type      VARCHAR(128) NOT NULL,
    role               VARCHAR(64)  NOT NULL,
    actor_type         VARCHAR(16)  DEFAULT 'human',
    company_id         UUID,
    domain             VARCHAR(64),
    permitted          BOOLEAN      NOT NULL,
    mode               VARCHAR(16)  NOT NULL DEFAULT 'observe',
    violations         JSONB,
    checked_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wf_permission_audit_company
    ON workflow_permission_audit_log(company_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_wf_permission_audit_type
    ON workflow_permission_audit_log(workflow_type, checked_at DESC);
