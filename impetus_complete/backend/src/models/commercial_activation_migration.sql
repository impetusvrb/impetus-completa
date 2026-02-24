-- ============================================================================
-- ATIVAÇÃO COMERCIAL CONTROLADA
-- is_first_access, senha temporária, fluxo B2B
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_access BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS temporary_password_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

COMMENT ON COLUMN users.is_first_access IS 'Cliente ativado comercialmente aguardando setup da empresa';
COMMENT ON COLUMN users.temporary_password_expires_at IS 'Expiração da senha temporária (24h)';
COMMENT ON COLUMN users.must_change_password IS 'Forçar troca de senha no próximo login';

CREATE INDEX IF NOT EXISTS idx_users_first_access ON users(is_first_access) WHERE is_first_access = true;
