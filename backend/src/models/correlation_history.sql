-- Histórico de padrões de correlação (metadados agregados, sem mensagens)
CREATE TABLE IF NOT EXISTS correlation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  pattern_type VARCHAR(64) NOT NULL,
  machine_id VARCHAR(256),
  event_type VARCHAR(256),
  occurrences INTEGER NOT NULL DEFAULT 1,
  window_days INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_correlation_history_company_created
  ON correlation_history (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_correlation_history_company_pattern
  ON correlation_history (company_id, pattern_type, machine_id, event_type);

COMMENT ON TABLE correlation_history IS 'Snapshots de padrões aprendidos (heurísticos) para análise temporal.';
