-- Equipes operacionais (chão de fábrica) + login coletivo e rastreabilidade por membro.
-- Executar: psql $DATABASE_URL -f operational_teams_factory_migration.sql

CREATE TABLE IF NOT EXISTS operational_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  company_role_id UUID REFERENCES company_roles(id) ON DELETE SET NULL,
  main_shift_label TEXT,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_teams_company ON operational_teams(company_id) WHERE active = true;

CREATE TABLE IF NOT EXISTS operational_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES operational_teams(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  shift_label TEXT,
  schedule_start TIME,
  schedule_end TIME,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_operational_team_members_team ON operational_team_members(team_id) WHERE active = true;

CREATE TABLE IF NOT EXISTS operational_team_member_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES operational_team_members(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otm_events_member ON operational_team_member_events(team_member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_otm_events_company ON operational_team_member_events(company_id, created_at DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_factory_team_account BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS operational_team_id UUID REFERENCES operational_teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_factory_team ON users(operational_team_id) WHERE is_factory_team_account = true;

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS active_operational_team_member_id UUID REFERENCES operational_team_members(id) ON DELETE SET NULL;

COMMENT ON COLUMN users.is_factory_team_account IS 'Login coletivo da equipe — exige seleção do membro ativo na sessão';
COMMENT ON COLUMN sessions.active_operational_team_member_id IS 'Membro da equipe que está operando nesta sessão (rastreabilidade)';
