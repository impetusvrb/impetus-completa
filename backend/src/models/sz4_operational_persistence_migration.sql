-- SZ4 — Operational Nervous System persistence (enterprise-grade, TTL, pilot rollout)
-- additive-only · tenant-scoped · no PII beyond existing SZ4 excerpts in payload JSONB

CREATE TABLE IF NOT EXISTS sz4_operational_persistence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  record_kind TEXT NOT NULL CHECK (record_kind IN ('event', 'thread', 'workflow', 'task', 'reminder')),
  record_id TEXT,
  thread_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sz4_persist_state_unique
  ON sz4_operational_persistence_records (tenant_id, record_kind, record_id)
  WHERE record_id IS NOT NULL AND record_kind <> 'event';

CREATE INDEX IF NOT EXISTS idx_sz4_persist_tenant_kind_updated
  ON sz4_operational_persistence_records (tenant_id, record_kind, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_sz4_persist_expires
  ON sz4_operational_persistence_records (expires_at);

CREATE INDEX IF NOT EXISTS idx_sz4_persist_tenant_thread
  ON sz4_operational_persistence_records (tenant_id, thread_id)
  WHERE thread_id IS NOT NULL;
