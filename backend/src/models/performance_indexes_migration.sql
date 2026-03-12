-- ============================================================================
-- IMPETUS - Índices de Performance
-- Otimiza queries frequentes sem alterar comportamento
-- CREATE INDEX IF NOT EXISTS - seguro para reexecução
-- ============================================================================

-- audit_logs: filtros por empresa e data (logs, auditoria)
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- communications: listagens por empresa
CREATE INDEX IF NOT EXISTS idx_communications_company_created ON communications(company_id, created_at DESC);

-- proposals: filtros por status e empresa (Pró-Ação)
CREATE INDEX IF NOT EXISTS idx_proposals_company_status ON proposals(company_id, status);
CREATE INDEX IF NOT EXISTS idx_proposals_created ON proposals(created_at DESC);

-- sessions: limpeza e lookup por token
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at) WHERE expires_at IS NOT NULL;
