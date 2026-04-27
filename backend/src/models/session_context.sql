-- Contexto de sessão IA: metadados por (empresa, utilizador). Sem mensagens completas.
-- Executar manualmente ou via pipeline de migrações da base de dados.

CREATE TABLE IF NOT EXISTS session_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  last_intents JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_entities JSONB NOT NULL DEFAULT '{}'::jsonb,
  contextual_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT session_context_company_user_unique UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_session_context_company_user
  ON session_context (company_id, user_id);

CREATE INDEX IF NOT EXISTS idx_session_context_company_updated
  ON session_context (company_id, updated_at DESC);
