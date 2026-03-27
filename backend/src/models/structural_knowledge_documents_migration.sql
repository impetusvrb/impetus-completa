-- Metadados da base de conhecimento (complementa POPs/manuais na Biblioteca)
-- Executar uma vez no PostgreSQL, ex.: psql $DATABASE_URL -f structural_knowledge_documents_migration.sql
-- UUIDs opcionais sem FK rígido para evitar falha se alguma tabela ainda não existir no ambiente.

CREATE TABLE IF NOT EXISTS company_knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  doc_type TEXT,
  category TEXT,
  summary TEXT,
  department_id UUID,
  line_id UUID,
  asset_id UUID,
  process_id UUID,
  product_id UUID,
  version TEXT,
  valid_until DATE,
  responsible_id UUID,
  keywords TEXT[],
  confidentiality_level TEXT,
  allowed_audience TEXT[],
  external_url TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_knowledge_documents_company ON company_knowledge_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_company_knowledge_documents_title ON company_knowledge_documents(company_id, title);
