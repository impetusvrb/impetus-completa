-- WAVE 2 / PROMPT 23 — Industrial Event Backbone (partitioning, archive, recovery, audit)
-- Aditivo, idempotente. Não remove colunas nem tabelas WAVE 1.

-- Partição lógica mensal (tenant + mês) para retenção e archive
ALTER TABLE industrial_event_outbox
  ADD COLUMN IF NOT EXISTS partition_month TEXT;

CREATE INDEX IF NOT EXISTS idx_industrial_outbox_partition_month
  ON industrial_event_outbox (partition_month, company_id, created_at DESC)
  WHERE partition_month IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_industrial_outbox_stale_pending
  ON industrial_event_outbox (updated_at ASC)
  WHERE status = 'pending';

-- Arquivo frio (delivered / purged via archive antes de DELETE)
CREATE TABLE IF NOT EXISTS industrial_event_archive (
  id UUID PRIMARY KEY,
  source_table TEXT NOT NULL DEFAULT 'industrial_event_outbox',
  event_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  company_id UUID NOT NULL,
  partition_key TEXT NOT NULL,
  partition_month TEXT NULL,
  idempotency_key TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  envelope JSONB NOT NULL DEFAULT '{}'::jsonb,
  original_status TEXT NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_industrial_archive_company_month
  ON industrial_event_archive (company_id, partition_month, archived_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_industrial_archive_idempotency
  ON industrial_event_archive (idempotency_key);

-- Auditoria de backpressure / throttling (LGPD-safe: sem payload)
CREATE TABLE IF NOT EXISTS industrial_event_backpressure_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NULL,
  event_name TEXT NULL,
  domain TEXT NULL,
  action TEXT NOT NULL,
  reason TEXT NOT NULL,
  queue_depth INT NOT NULL DEFAULT 0,
  publish_rate INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_industrial_bp_audit_company_created
  ON industrial_event_backpressure_audit (company_id, created_at DESC);

-- Checkpoint de recovery de stream (por instância / boot)
CREATE TABLE IF NOT EXISTS industrial_event_stream_checkpoint (
  id TEXT PRIMARY KEY DEFAULT 'default',
  last_recovery_at TIMESTAMPTZ NULL,
  stale_reset_count INT NOT NULL DEFAULT 0,
  pending_recovered INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO industrial_event_stream_checkpoint (id, updated_at)
VALUES ('default', now())
ON CONFLICT (id) DO NOTHING;

-- DLQ: suporte a redrive
ALTER TABLE industrial_event_dlq
  ADD COLUMN IF NOT EXISTS redriven_at TIMESTAMPTZ NULL;

ALTER TABLE industrial_event_dlq
  ADD COLUMN IF NOT EXISTS redrive_count INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_industrial_dlq_redrive
  ON industrial_event_dlq (company_id, created_at DESC)
  WHERE redriven_at IS NULL;
