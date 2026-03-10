-- ============================================================================
-- IMPETUS COMUNICA IA - SEGURANÇA ENTERPRISE
-- RBAC Avançado, Auditoria IA, JWT Profissional, LGPD
-- Registro INPI: BR512025007048-9
-- ============================================================================

-- 1) RBAC: Permissões
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category VARCHAR(32), -- financial, hr, production, strategic, admin
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) RBAC: Roles (papéis hierárquicos)
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  hierarchy_level INTEGER NOT NULL, -- 0=ceo, 1=diretor, 2=gerente, 3=coordenador, 4=supervisor, 5=colaborador
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) RBAC: Associação role-permission
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

-- 4) Associação user-role (um usuário pode ter uma role principal)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;

-- 5) Auditoria IA (imutável - toda interação com IA)
CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  action VARCHAR(64) NOT NULL, -- 'chat', 'executive_query', 'smart_summary', 'org_assistant'
  question TEXT,
  response_preview TEXT, -- primeiros 500 chars da resposta
  response_length INTEGER,
  blocked BOOLEAN DEFAULT false,
  block_reason VARCHAR(128),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_user ON ai_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_company ON ai_audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_created ON ai_audit_logs(created_at DESC);

-- Trigger para tornar ai_audit_logs imutável (sem UPDATE/DELETE)
CREATE OR REPLACE FUNCTION prevent_ai_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ai_audit_logs é imutável - registros não podem ser alterados ou removidos';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ai_audit_no_update ON ai_audit_logs;
CREATE TRIGGER trg_ai_audit_no_update
  BEFORE UPDATE ON ai_audit_logs
  FOR EACH ROW EXECUTE PROCEDURE prevent_ai_audit_modification();

DROP TRIGGER IF EXISTS trg_ai_audit_no_delete ON ai_audit_logs;
CREATE TRIGGER trg_ai_audit_no_delete
  BEFORE DELETE ON ai_audit_logs
  FOR EACH ROW EXECUTE PROCEDURE prevent_ai_audit_modification();

-- 6) Refresh tokens (JWT profissional)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address INET,
  user_agent TEXT,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- 7) Rate limit por usuário (controle de abuso)
CREATE TABLE IF NOT EXISTS user_rate_limits (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  window_key VARCHAR(64) NOT NULL, -- ex: 'ai_chat:2025-02-26-14'
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, window_key)
);

-- 8) Dados sensíveis criptografados (LGPD) - tabela de referência para campos
CREATE TABLE IF NOT EXISTS sensitive_fields_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name VARCHAR(64) NOT NULL,
  column_name VARCHAR(64) NOT NULL,
  encryption_enabled BOOLEAN DEFAULT false,
  UNIQUE(table_name, column_name)
);

-- Inserir permissões granulares
INSERT INTO permissions (code, name, category) VALUES
  ('VIEW_FINANCIAL', 'Visualizar dados financeiros', 'financial'),
  ('VIEW_HR', 'Visualizar dados de RH', 'hr'),
  ('VIEW_PRODUCTION', 'Visualizar dados de produção', 'production'),
  ('VIEW_STRATEGIC', 'Visualizar dados estratégicos', 'strategic'),
  ('VIEW_REPORTS', 'Visualizar relatórios', 'reports'),
  ('MANAGE_USERS', 'Gerenciar usuários', 'admin'),
  ('ACCESS_AI_ANALYTICS', 'Acessar análises de IA', 'admin')
ON CONFLICT (code) DO NOTHING;

-- Inserir roles hierárquicas
INSERT INTO roles (code, name, hierarchy_level) VALUES
  ('ceo', 'CEO', 0),
  ('diretor', 'Diretor', 1),
  ('gerente', 'Gerente', 2),
  ('coordenador', 'Coordenador', 3),
  ('supervisor', 'Supervisor', 4),
  ('colaborador', 'Colaborador', 5)
ON CONFLICT (code) DO NOTHING;

-- Atribuir permissões às roles (CEO e Diretor têm todas)
DO $$
DECLARE
  r RECORD;
  p RECORD;
BEGIN
  FOR r IN SELECT id FROM roles WHERE code IN ('ceo', 'diretor') LOOP
    FOR p IN SELECT id FROM permissions LOOP
      INSERT INTO role_permissions (role_id, permission_id) VALUES (r.id, p.id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END LOOP;
  END LOOP;
  
  -- Gerente: tudo exceto MANAGE_USERS
  FOR p IN SELECT id FROM permissions WHERE code != 'MANAGE_USERS' LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r WHERE r.code = 'gerente'
    ON CONFLICT DO NOTHING;
  END LOOP;
  
  -- Coordenador e Supervisor: produção, relatórios, IA
  FOR p IN SELECT id FROM permissions WHERE code IN ('VIEW_PRODUCTION', 'VIEW_REPORTS', 'ACCESS_AI_ANALYTICS') LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r WHERE r.code IN ('coordenador', 'supervisor')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END LOOP;
  
  -- Colaborador: apenas produção e IA básica
  FOR p IN SELECT id FROM permissions WHERE code IN ('VIEW_PRODUCTION', 'ACCESS_AI_ANALYTICS') LOOP
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id FROM roles r WHERE r.code = 'colaborador'
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END LOOP;
END $$;
