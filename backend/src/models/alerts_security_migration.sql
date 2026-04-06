-- Isolamento multi-tenant para GET /api/alerts (legado).
-- Executar na BD antes de confiar no filtro por empresa.
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_alerts_company_created ON alerts(company_id, created_at DESC NULLS LAST);
