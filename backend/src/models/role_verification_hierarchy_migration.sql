-- ============================================================================
-- IMPETUS - SISTEMA DE VALIDAÇÃO HIERÁRQUICA DE CARGOS
-- Garantia de que apenas pessoas em posições estratégicas reais acessem dados sensíveis
-- Raiz de confiança: CEO/Responsável legal (verificado no cadastro da empresa)
-- ============================================================================

-- 1) Campos de verificação no usuário
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_verification_status VARCHAR(24) DEFAULT 'pending';
  -- pending: aguardando verificação | verified: cargo validado | rejected: rejeitado
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_verified_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_verification_method VARCHAR(32);
  -- hierarchical_approval | corporate_email | corporate_document
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_company_root BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_role_verified ON users(company_id, role_verification_status);
COMMENT ON COLUMN users.is_company_root IS 'Usuário raiz da empresa (validador principal). Definido no setup ou responsável legal.';

-- 2) Domínio corporativo (para validação por email)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_domain VARCHAR(255);
COMMENT ON COLUMN companies.company_domain IS 'Domínio de email corporativo ex: empresa.com. Usado para validação automática de cargos.';

-- 3) Fundador/raiz da empresa (CEO verificado no cadastro)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS founder_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_companies_founder ON companies(founder_id);
COMMENT ON COLUMN companies.founder_id IS 'Usuário que completou cadastro da empresa. Raiz de confiança para validações.';

-- 4) Solicitações de aprovação hierárquica
CREATE TABLE IF NOT EXISTS role_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL,
  approver_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(24) DEFAULT 'pending',
  -- pending | approved | rejected
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_role_verif_company ON role_verification_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_role_verif_approver ON role_verification_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_role_verif_status ON role_verification_requests(status);

-- 5) Documentos corporativos (upload para validação)
CREATE TABLE IF NOT EXISTS role_verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type VARCHAR(48),
  -- cracha_corporativo | organograma | documento_rh | carta_nomeacao
  file_path TEXT NOT NULL,
  file_name TEXT,
  ai_extracted_name TEXT,
  ai_extracted_role TEXT,
  ai_confidence DECIMAL(5,4),
  verification_result VARCHAR(24),
  -- pending | approved | rejected
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_role_doc_user ON role_verification_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_role_doc_company ON role_verification_documents(company_id);
