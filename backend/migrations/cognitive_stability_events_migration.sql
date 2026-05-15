-- Cognitive Stability Index — histórico observacional (não altera runtime).
CREATE TABLE IF NOT EXISTS cognitive_stability_events (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  company_id UUID NULL,
  csi NUMERIC NOT NULL,
  status TEXT NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cognitive_stability_events_company_created
  ON cognitive_stability_events (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cognitive_stability_events_created_at
  ON cognitive_stability_events (created_at DESC);
