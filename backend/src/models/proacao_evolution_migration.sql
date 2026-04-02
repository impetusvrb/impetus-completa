-- Evolução incremental do módulo Pró-Ação (sem quebra retrocompatível)
BEGIN;

ALTER TABLE IF EXISTS proposals
  ADD COLUMN IF NOT EXISTS titulo text,
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS descricao_enriquecida text,
  ADD COLUMN IF NOT EXISTS setor text,
  ADD COLUMN IF NOT EXISTS prioridade text,
  ADD COLUMN IF NOT EXISTS responsavel_id uuid,
  ADD COLUMN IF NOT EXISTS impacto_financeiro numeric(14,2),
  ADD COLUMN IF NOT EXISTS reducao_tempo numeric(7,2),
  ADD COLUMN IF NOT EXISTS reducao_perda numeric(7,2),
  ADD COLUMN IF NOT EXISTS custo_implementacao numeric(14,2),
  ADD COLUMN IF NOT EXISTS payback_meses numeric(10,2),
  ADD COLUMN IF NOT EXISTS score_ia integer,
  ADD COLUMN IF NOT EXISTS ia_sugerida boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prazo date,
  ADD COLUMN IF NOT EXISTS data_aprovacao timestamptz,
  ADD COLUMN IF NOT EXISTS data_conclusao timestamptz,
  ADD COLUMN IF NOT EXISTS anexos jsonb,
  ADD COLUMN IF NOT EXISTS observacoes_ia text;

UPDATE proposals
   SET titulo = COALESCE(titulo, problem_category)
 WHERE titulo IS NULL;

UPDATE proposals
   SET descricao = COALESCE(descricao, proposed_solution)
 WHERE descricao IS NULL;

UPDATE proposals
   SET setor = COALESCE(setor, location)
 WHERE setor IS NULL;

UPDATE proposals
   SET status = CASE
     WHEN status = 'submitted' THEN 'nova'
     WHEN status = 'escalated' THEN 'analise'
     WHEN status = 'assigned' THEN 'execucao'
     WHEN status = 'done' THEN 'concluida'
     ELSE COALESCE(status, 'nova')
   END
 WHERE status IN ('submitted', 'escalated', 'assigned', 'done') OR status IS NULL;

ALTER TABLE IF EXISTS proposals
  ADD CONSTRAINT proposals_prioridade_check
  CHECK (prioridade IS NULL OR prioridade IN ('baixa', 'media', 'alta'));

ALTER TABLE IF EXISTS proposals
  ADD CONSTRAINT proposals_status_check
  CHECK (status IS NULL OR status IN ('nova', 'analise', 'aprovacao', 'execucao', 'concluida', 'rejeitada'));

CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);
CREATE INDEX IF NOT EXISTS idx_proposals_setor ON proposals(setor);
CREATE INDEX IF NOT EXISTS idx_proposals_prioridade ON proposals(prioridade);
CREATE INDEX IF NOT EXISTS idx_proposals_responsavel_id ON proposals(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_proposals_prazo ON proposals(prazo);

COMMIT;
