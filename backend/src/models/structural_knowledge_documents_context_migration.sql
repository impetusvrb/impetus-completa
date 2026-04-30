CREATE TABLE IF NOT EXISTS structural_knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL,
  title TEXT,
  summary TEXT,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_structural_knowledge_documents_company
  ON structural_knowledge_documents(company_id);

CREATE INDEX IF NOT EXISTS idx_structural_knowledge_documents_company_created
  ON structural_knowledge_documents(company_id, created_at DESC);
