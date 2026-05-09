-- Memória cognitiva estruturada (event store) — paralela ao JSON; não substitui RAM/JSON.
-- Executado por scripts/run-all-migrations.js a partir de backend/migrations/

CREATE TABLE IF NOT EXISTS cognitive_interactions (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  company_id UUID NULL,
  module TEXT NULL,
  confidence NUMERIC NULL,
  data_state TEXT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cognitive_interactions_created_at ON cognitive_interactions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cognitive_interactions_company_id ON cognitive_interactions (company_id) WHERE company_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS cognitive_proposals (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  proposal_type TEXT NOT NULL,
  status TEXT NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cognitive_proposals_status ON cognitive_proposals (status);
CREATE INDEX IF NOT EXISTS idx_cognitive_proposals_created_at ON cognitive_proposals (created_at DESC);

CREATE TABLE IF NOT EXISTS cognitive_autonomous_events (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cognitive_autonomous_created_at ON cognitive_autonomous_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cognitive_autonomous_event_type ON cognitive_autonomous_events (event_type);
