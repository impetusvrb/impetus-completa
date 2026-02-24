-- ============================================================================
-- MULTI-TENANT PROFISSIONAL
-- plan_type, company_id em tabelas legadas, índices
-- ============================================================================

-- Companies: adicionar plan_type (compatível com subscription_tier)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS plan_type TEXT;
UPDATE companies SET plan_type = COALESCE(subscription_tier, 'essencial') WHERE plan_type IS NULL;
COMMENT ON COLUMN companies.plan_type IS 'Plano: essencial, profissional, estratégico, enterprise';

-- Messages (legado): vincular a company
ALTER TABLE messages ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_messages_company ON messages(company_id);

-- Proposal_actions: company_id
ALTER TABLE proposal_actions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_proposal_actions_company ON proposal_actions(company_id);

-- Índices compostos para performance multi-tenant
CREATE INDEX IF NOT EXISTS idx_users_company_active ON users(company_id, active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_communications_company_created ON communications(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_company_status ON proposals(company_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_company_status ON tasks(company_id, status) WHERE company_id IS NOT NULL;
