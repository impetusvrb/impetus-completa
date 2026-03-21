-- ============================================================================
-- IMPETUS - Índices para otimizar COUNT e consultas em tabelas grandes
-- Reduz tempo de agregação em communications e users
-- ============================================================================

-- Communications: filtro por company_id + ordenação por created_at
CREATE INDEX IF NOT EXISTS idx_communications_company_created 
  ON communications (company_id, created_at DESC);

-- Communications: cobertura para filtros hierárquicos (sender, recipient)
CREATE INDEX IF NOT EXISTS idx_communications_company_sender 
  ON communications (company_id, sender_id) 
  WHERE sender_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_communications_company_recipient_dept 
  ON communications (company_id, recipient_department_id) 
  WHERE recipient_department_id IS NOT NULL;

-- Users: listagem admin por company
CREATE INDEX IF NOT EXISTS idx_users_company_created 
  ON users (company_id, created_at DESC) 
  WHERE deleted_at IS NULL;

-- Users: busca por role e department
CREATE INDEX IF NOT EXISTS idx_users_company_role_active 
  ON users (company_id, role, active) 
  WHERE deleted_at IS NULL;
