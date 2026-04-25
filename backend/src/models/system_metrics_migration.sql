-- Snapshots de métricas de observabilidade (histórico; uma linha por chave por instantâneo)
-- Não contém PII. Seguro: IF NOT EXISTS

CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key TEXT NOT NULL,
  value DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_key_created
  ON system_metrics(metric_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_metrics_created
  ON system_metrics(created_at DESC);
