-- Cognitive Event Backbone — eventos cognitivos persistentes (paralelo à RAM; não substitui motores).
-- Executado por scripts/run-all-migrations.js a partir de backend/migrations/

CREATE TABLE IF NOT EXISTS cognitive_event_backbone (
  id UUID PRIMARY KEY,
  event_type TEXT NOT NULL,
  trace_id TEXT NULL,
  company_id UUID NULL,
  channel TEXT NULL,
  runtime TEXT NULL,
  context_hash TEXT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_critical BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_cognitive_event_backbone_company_id ON cognitive_event_backbone (company_id)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cognitive_event_backbone_trace_id ON cognitive_event_backbone (trace_id)
  WHERE trace_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cognitive_event_backbone_event_type ON cognitive_event_backbone (event_type);

CREATE INDEX IF NOT EXISTS idx_cognitive_event_backbone_created_at ON cognitive_event_backbone (created_at DESC);
