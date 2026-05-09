-- Eventos de calibração de confiança (observabilidade; não altera runtime).
CREATE TABLE IF NOT EXISTS cognitive_calibration_events (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  company_id UUID NULL,
  calibrated_confidence NUMERIC NOT NULL,
  overconfidence BOOLEAN NOT NULL,
  underconfidence BOOLEAN NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cognitive_calibration_events_company_created
  ON cognitive_calibration_events (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cognitive_calibration_events_created_at
  ON cognitive_calibration_events (created_at DESC);
