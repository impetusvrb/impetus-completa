-- PROMPT 22 — Industrial Edge Runtime + Lab E2E

CREATE TABLE IF NOT EXISTS edge_runtime_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  edge_sequence TEXT NOT NULL,
  idempotency_key TEXT,
  connector_source TEXT NOT NULL DEFAULT 'edge',
  payload JSONB NOT NULL DEFAULT '{}',
  enqueued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '14 days')
);

CREATE INDEX IF NOT EXISTS idx_edge_queue_company_pending
  ON edge_runtime_queue (company_id, enqueued_at)
  WHERE synced_at IS NULL;

CREATE TABLE IF NOT EXISTS edge_sync_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  trace_id TEXT NOT NULL,
  event TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'ok',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_edge_sync_audit_company
  ON edge_sync_audit (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS industrial_lab_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  run_id TEXT NOT NULL,
  suite TEXT NOT NULL DEFAULT 'e2e',
  ok BOOLEAN NOT NULL DEFAULT false,
  checks JSONB NOT NULL DEFAULT '[]',
  connectors JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_industrial_lab_runs_created
  ON industrial_lab_runs (created_at DESC);
