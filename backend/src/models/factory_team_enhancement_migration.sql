-- Melhorias: revalidação de sessão, rastreabilidade em registros, relatórios.
-- Executar após operational_teams_factory_migration.sql

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS factory_member_confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN sessions.factory_member_confirmed_at IS 'Última confirmação do membro ativo (revalidação periódica / troca de turno)';

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS operational_team_member_id UUID REFERENCES operational_team_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_factory_member ON proposals(operational_team_member_id) WHERE operational_team_member_id IS NOT NULL;

ALTER TABLE intelligent_registrations ADD COLUMN IF NOT EXISTS operational_team_member_id UUID REFERENCES operational_team_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_intelligent_reg_factory_member ON intelligent_registrations(operational_team_member_id) WHERE operational_team_member_id IS NOT NULL;
