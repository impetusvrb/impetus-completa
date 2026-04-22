-- IMPETUS — Validação humana orgânica em insights operacionais (Centro de Comando / Cérebro)

ALTER TABLE operational_insights
  ADD COLUMN IF NOT EXISTS human_validation_status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS human_validation_modality VARCHAR(16),
  ADD COLUMN IF NOT EXISTS human_validation_evidence TEXT,
  ADD COLUMN IF NOT EXISTS human_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS human_validated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_ai_trace_id UUID;

COMMENT ON COLUMN operational_insights.human_validation_status IS
  'ACCEPTED | REJECTED | ADJUSTED | PENDING | NULL — após confirmação por voz/texto/gesto.';
COMMENT ON COLUMN operational_insights.linked_ai_trace_id IS
  'Opcional: trace_id da interação IA que gerou ou contextualizou o insight.';
