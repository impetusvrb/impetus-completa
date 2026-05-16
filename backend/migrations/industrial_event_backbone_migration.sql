-- WAVE 1 — Industrial Event Backbone (outbox + DLQ + replay log)
-- Aditivo, idempotente. Não altera tabelas existentes.

CREATE TABLE IF NOT EXISTS industrial_event_outbox (
  id UUID PRIMARY KEY,
  event_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  company_id UUID NOT NULL,
  partition_key TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  correlation_id TEXT NOT NULL,
  causation_id TEXT NULL,
  trace_id TEXT NULL,
  workflow_id TEXT NULL,
  envelope JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_industrial_outbox_status_next
  ON industrial_event_outbox (status, next_attempt_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_industrial_outbox_company_created
  ON industrial_event_outbox (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_industrial_outbox_domain
  ON industrial_event_outbox (domain);

CREATE TABLE IF NOT EXISTS industrial_event_dlq (
  id UUID PRIMARY KEY,
  event_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  company_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  correlation_id TEXT NOT NULL,
  envelope JSONB NOT NULL DEFAULT '{}'::jsonb,
  failure_reason TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'outbox',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_industrial_dlq_company_created
  ON industrial_event_dlq (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_industrial_dlq_domain
  ON industrial_event_dlq (domain);

CREATE TABLE IF NOT EXISTS industrial_event_replay_log (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL,
  source TEXT NOT NULL,
  items_checked INT NOT NULL DEFAULT 0,
  divergences INT NOT NULL DEFAULT 0,
  matches INT NOT NULL DEFAULT 0,
  divergence_rate NUMERIC NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_industrial_replay_log_run
  ON industrial_event_replay_log (run_id, created_at DESC);
