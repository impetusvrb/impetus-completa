-- ============================================================================
-- SISTEMA DE IDENTIFICAÇÃO E ATIVAÇÃO DE USUÁRIO - IMPETUS
-- Segurança: Primeiro login coleta dados + PIN; logins diários exigem verificação
-- ============================================================================

-- Registro pré-existente de nomes (validação contra banco/HR)
-- Admin ou importação popula esta tabela para validar nome no primeiro acesso
CREATE TABLE IF NOT EXISTS registered_names (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registered_names_company ON registered_names(company_id);

-- Perfil de ativação (completado no primeiro acesso)
CREATE TABLE IF NOT EXISTS user_activation_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL,
  job_title TEXT NOT NULL,
  daily_activities_description TEXT,
  activated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activation_user ON user_activation_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activation_company ON user_activation_profiles(company_id);

-- PIN de 4 dígitos (hash bcrypt, never plain text)
CREATE TABLE IF NOT EXISTS user_activation_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_pin_user ON user_activation_pins(user_id);

-- Verificação diária de sessão (nome + PIN válido hoje)
CREATE TABLE IF NOT EXISTS user_daily_verification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_date DATE NOT NULL DEFAULT CURRENT_DATE,
  verified_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  CONSTRAINT uq_daily_verification UNIQUE (user_id, verification_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_verification_user ON user_daily_verification(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_verification_date ON user_daily_verification(verification_date);

-- Histórico da conversa de ativação (IA pergunta, usuário responde)
CREATE TABLE IF NOT EXISTS activation_conversa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "role" TEXT NOT NULL CHECK ("role" IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activation_conversa_user ON activation_conversa(user_id);
CREATE INDEX IF NOT EXISTS idx_activation_conversa_company ON activation_conversa(company_id);

-- Auditoria de tentativas falhas (segurança)
CREATE TABLE IF NOT EXISTS user_identification_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'pin_failure', 'pin_lockout', 'invalid_name', 'first_access_success',
    'daily_verify_success', 'daily_verify_failure', 'session_terminated'
  )),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identification_audit_user ON user_identification_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_identification_audit_company ON user_identification_audit(company_id);
CREATE INDEX IF NOT EXISTS idx_identification_audit_event ON user_identification_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_identification_audit_created ON user_identification_audit(created_at);

-- Comentários
COMMENT ON TABLE registered_names IS 'Registro pré-existente de colaboradores para validar nome no primeiro acesso';
COMMENT ON TABLE user_activation_profiles IS 'Dados cadastrais coletados na ativação (primeiro login)';
COMMENT ON TABLE user_activation_pins IS 'PIN de 4 dígitos (hash) para verificação diária';
COMMENT ON TABLE user_daily_verification IS 'Registro de verificação diária bem-sucedida';
COMMENT ON TABLE user_identification_audit IS 'Auditoria de falhas de PIN e tentativas de acesso';
