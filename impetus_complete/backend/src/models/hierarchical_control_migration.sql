-- ============================================================================
-- IMPETUS - CONTROLE HIERÁRQUICO REAL
-- supervisor_id, vínculos e estrutura para filtro por nível
-- Mesmo módulo ≠ mesmos dados. Isolamento real por responsabilidade.
-- ============================================================================

-- 1) supervisor_id no usuário (vínculo com superior imediato)
ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_supervisor ON users(supervisor_id);

COMMENT ON COLUMN users.supervisor_id IS 'Superior imediato na hierarquia. Usado para filtro: supervisor vê subordinados, colaborador vê só a si.';

-- 2) Tabela de cache para escopo hierárquico (opcional, melhora performance)
CREATE TABLE IF NOT EXISTS user_hierarchy_scope (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  managed_department_ids UUID[] DEFAULT '{}',
  subordinate_user_ids UUID[] DEFAULT '{}',
  scope_level VARCHAR(16), -- full, manager, coordinator, supervisor, individual
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_scope_level ON user_hierarchy_scope(scope_level);

COMMENT ON TABLE user_hierarchy_scope IS 'Cache do escopo hierárquico resolvido. Atualizar quando department/supervisor mudar.';
