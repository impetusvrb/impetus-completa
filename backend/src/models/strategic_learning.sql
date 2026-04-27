-- Aprendizado estratégico (metadados apenas — sem texto de utilizador nem resposta da IA)
-- Executar na base antes de usar o strategicLearningService.

CREATE TABLE IF NOT EXISTS strategic_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  intent VARCHAR(160) NOT NULL DEFAULT '',
  had_data BOOLEAN NOT NULL DEFAULT false,
  used_fallback BOOLEAN NOT NULL DEFAULT false,
  response_score NUMERIC(6, 2),
  context_tag VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategic_learning_company_created
  ON strategic_learning (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_strategic_learning_company_intent
  ON strategic_learning (company_id, intent);

COMMENT ON TABLE strategic_learning IS 'Traços de decisão agregados; uma linha por (decisão × context_tag) quando context_tags têm múltiplos valores.';

-- Comportamento do utilizador (metadados; satisfaction_signal = código curto, não texto livre)
CREATE TABLE IF NOT EXISTS strategic_user_behavior (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  intent VARCHAR(160) NOT NULL DEFAULT '',
  followup_used BOOLEAN NOT NULL DEFAULT false,
  satisfaction_signal VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_strategic_user_behavior_company_created
  ON strategic_user_behavior (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_strategic_user_behavior_user
  ON strategic_user_behavior (user_id, created_at DESC);
