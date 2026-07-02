-- CERT-PULSE-04 — Validação Human-in-the-Loop de insights (aditivo, não altera pesos)

CREATE TABLE IF NOT EXISTS pulse_cognitive_insight_validation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  insight_id UUID NOT NULL REFERENCES pulse_cognitive_insights(id) ON DELETE CASCADE,
  validator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  validation_status TEXT NOT NULL CHECK (validation_status IN ('confirmed', 'partial', 'rejected')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pc_insight_val_company
  ON pulse_cognitive_insight_validation(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pc_insight_val_insight
  ON pulse_cognitive_insight_validation(insight_id);

COMMENT ON TABLE pulse_cognitive_insight_validation IS
  'CERT-PULSE-04: feedback RH sobre insights (métricas de qualidade; não altera pesos do modelo).';
