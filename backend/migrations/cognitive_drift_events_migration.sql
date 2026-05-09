-- Eventos de drift cognitivo (observabilidade; não altera runtime).
CREATE TABLE IF NOT EXISTS cognitive_drift_events (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  company_id UUID NULL,
  drift_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cognitive_drift_events_company_created ON cognitive_drift_events (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cognitive_drift_events_created_at ON cognitive_drift_events (created_at DESC);
