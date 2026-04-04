-- Índices para analytics temporal e filtros
CREATE INDEX IF NOT EXISTS idx_pulse_eval_company_self_completed
  ON pulse_evaluations(company_id, self_completed_at)
  WHERE self_completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pulse_eval_company_created
  ON pulse_evaluations(company_id, created_at);

-- Segmentação opcional para gráficos por turno / equipe (preenchimento manual ou integração futura)
ALTER TABLE users ADD COLUMN IF NOT EXISTS pulse_shift_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS pulse_team_label TEXT;

COMMENT ON COLUMN users.pulse_shift_code IS 'Turno para analytics Pulse (ex.: A, B, C)';
COMMENT ON COLUMN users.pulse_team_label IS 'Equipe / célula para analytics Pulse';
