-- Cognitive Safety Runtime — eventos observacionais (airbag operacional).
CREATE TABLE IF NOT EXISTS cognitive_safety_events (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  company_id UUID NULL,
  risk_level TEXT NOT NULL,
  risk_score NUMERIC NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cognitive_safety_events_company_created
  ON cognitive_safety_events (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cognitive_safety_events_created_at
  ON cognitive_safety_events (created_at DESC);
