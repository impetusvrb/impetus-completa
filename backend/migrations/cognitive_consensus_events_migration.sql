-- Eventos de consenso / divergência entre outputs cognitivos (observabilidade; não altera runtime).
CREATE TABLE IF NOT EXISTS cognitive_consensus_events (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  company_id UUID NULL,
  consensus_score NUMERIC NOT NULL,
  divergence_detected BOOLEAN NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cognitive_consensus_events_company_created
  ON cognitive_consensus_events (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cognitive_consensus_events_created_at
  ON cognitive_consensus_events (created_at DESC);
