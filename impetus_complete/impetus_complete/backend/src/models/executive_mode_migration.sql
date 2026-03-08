-- ============================================================================
-- MODO EXECUTIVO (CEO Mode)
-- Campos para verificação executiva, sessão e auditoria
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS executive_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ipc_document_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS executive_session_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS executive_last_verified TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS executive_session_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS executive_last_activity TIMESTAMPTZ;

COMMENT ON COLUMN users.executive_verified IS 'CEO verificado via certificado IPC ou assinatura equivalente';
COMMENT ON COLUMN users.ipc_document_hash IS 'Hash criptográfico do documento de verificação enviado';
COMMENT ON COLUMN users.executive_session_token IS 'Token de sessão executiva (criptografado) para WhatsApp';
COMMENT ON COLUMN users.executive_last_verified IS 'Data da última verificação executiva';
COMMENT ON COLUMN users.executive_session_expires_at IS 'Expiração da sessão executiva (30 min inatividade)';
COMMENT ON COLUMN users.executive_last_activity IS 'Última atividade na sessão executiva';

-- Tabela para auditoria de interações executivas (severity critical)
CREATE TABLE IF NOT EXISTS executive_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  channel TEXT DEFAULT 'whatsapp',
  request_summary TEXT,
  response_summary TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_executive_audit_company ON executive_audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_executive_audit_user ON executive_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_executive_audit_created ON executive_audit_logs(created_at);
