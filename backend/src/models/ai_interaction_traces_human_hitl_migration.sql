-- IMPETUS — Human-in-the-loop invisível: validação por texto/voz/vídeo correlacionada ao trace
-- Executar no PostgreSQL após revisão.

ALTER TABLE ai_interaction_traces
  ADD COLUMN IF NOT EXISTS human_validation_status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS validation_modality VARCHAR(16),
  ADD COLUMN IF NOT EXISTS validation_evidence TEXT,
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validation_audit JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN ai_interaction_traces.human_validation_status IS
  'PENDING | ACCEPTED | REJECTED | ADJUSTED | SUPERSEDED | NULL (não aplicável). SUPERSEDED = nova sugestão substituiu a pendente.';
COMMENT ON COLUMN ai_interaction_traces.validation_modality IS
  'TEXT | VOICE | VIDEO quando validado.';
COMMENT ON COLUMN ai_interaction_traces.validation_evidence IS
  'Trecho imutável da prova (transcrição ou descrição do gesto).';
COMMENT ON COLUMN ai_interaction_traces.validated_at IS
  'Momento em que a validação humana foi registada.';
COMMENT ON COLUMN ai_interaction_traces.validation_audit IS
  'Array append-only de eventos de auditoria (histórico imutável de tentativas/classificação).';

CREATE INDEX IF NOT EXISTS idx_ai_traces_company_user_pending
  ON ai_interaction_traces (company_id, user_id, created_at DESC)
  WHERE human_validation_status = 'PENDING';
