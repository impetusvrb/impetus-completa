-- Trilha legal (ai_legal_audit_logs): append-only físico — sem DELETE.
-- Retenção = arquivamento lógico (LGPD: minimização com histórico; ISO 42001: integridade de evidências).

ALTER TABLE ai_legal_audit_logs
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

ALTER TABLE ai_legal_audit_logs
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

COMMENT ON COLUMN ai_legal_audit_logs.archived IS
  'true quando o registo foi arquivado por política de retenção; a linha permanece para auditoria.';

COMMENT ON COLUMN ai_legal_audit_logs.archived_at IS
  'Instante do arquivamento (job dataLifecycleService).';

CREATE INDEX IF NOT EXISTS idx_ai_legal_audit_logs_active
  ON ai_legal_audit_logs (company_id, created_at DESC)
  WHERE archived IS NOT TRUE;
