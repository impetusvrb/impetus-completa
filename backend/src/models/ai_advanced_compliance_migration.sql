-- ============================================================================
-- IMPETUS — Advanced Compliance (auditoria ampliada, evidência regulatória)
-- Executar após ai_compliance_engine_migration.sql
-- ============================================================================

ALTER TABLE ai_legal_audit_logs
  ADD COLUMN IF NOT EXISTS regulation_tag VARCHAR(32),
  ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS retention_applied BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anonymization_applied BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN ai_legal_audit_logs.regulation_tag IS
  'Framework(s) aplicável(is), ex.: LGPD, GDPR.';
COMMENT ON COLUMN ai_legal_audit_logs.compliance_status IS
  'Estado agregado da decisão: COMPLIANT, REVIEW_REQUIRED, BLOCKED, ANONYMIZED.';
COMMENT ON COLUMN ai_legal_audit_logs.retention_applied IS
  'True quando política de retenção/expurgo foi aplicada a este registo (auditoria).';
COMMENT ON COLUMN ai_legal_audit_logs.anonymization_applied IS
  'True quando anonimização foi aplicada na decisão registada.';

CREATE INDEX IF NOT EXISTS idx_ai_legal_audit_regulation
  ON ai_legal_audit_logs (company_id, regulation_tag, created_at DESC);
