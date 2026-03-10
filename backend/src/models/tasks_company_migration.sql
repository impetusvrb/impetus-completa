-- Adiciona company_id à tabela tasks para isolamento multi-tenant
-- Tarefas existentes ficam com company_id NULL (não aparecem em listagens por empresa)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_company ON tasks(company_id);
