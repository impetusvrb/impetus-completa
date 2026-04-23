-- Opcional: desempenho da Central de Governança (listagens globais e janelas temporais).
-- Executar após revisão. Não altera comportamento funcional.

CREATE INDEX IF NOT EXISTS idx_ai_incidents_severity_created
  ON ai_incidents (severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_incidents_created
  ON ai_incidents (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_incidents_open_severity
  ON ai_incidents (status, severity)
  WHERE status NOT IN ('RESOLVED', 'FALSE_POSITIVE');
