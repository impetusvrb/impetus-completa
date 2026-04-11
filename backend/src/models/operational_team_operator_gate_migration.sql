-- Gate secundário (matrícula + senha) para membros de equipe operacional + Pulse por membro.
-- Ordem: operational_teams_factory_migration.sql → impetus_pulse_migration.sql → este ficheiro.
-- Exemplo: psql "$DATABASE_URL" -f backend/src/models/operational_team_operator_gate_migration.sql

ALTER TABLE operational_team_members
  ADD COLUMN IF NOT EXISTS matricula TEXT,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS operator_kind TEXT,
  ADD COLUMN IF NOT EXISTS access_password_hash TEXT;

ALTER TABLE operational_team_members DROP CONSTRAINT IF EXISTS operational_team_members_operator_kind_check;
ALTER TABLE operational_team_members ADD CONSTRAINT operational_team_members_operator_kind_check
  CHECK (operator_kind IS NULL OR operator_kind IN ('auxiliar', 'operador'));

COMMENT ON COLUMN operational_team_members.matricula IS 'Identificador único do colaborador na equipe (login secundário)';
COMMENT ON COLUMN operational_team_members.access_password_hash IS 'Senha individual: bcrypt(matricula + 3 chars ou definida pelo admin)';

CREATE UNIQUE INDEX IF NOT EXISTS idx_otm_team_matricula_active
  ON operational_team_members (team_id, lower(trim(matricula)))
  WHERE matricula IS NOT NULL AND btrim(matricula) <> '' AND active = true;

-- Pulse: avaliações vinculadas ao membro da equipe (sem user_id)
ALTER TABLE pulse_evaluations
  ADD COLUMN IF NOT EXISTS operational_team_member_id UUID REFERENCES operational_team_members(id) ON DELETE CASCADE;

ALTER TABLE pulse_evaluations ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE pulse_evaluations DROP CONSTRAINT IF EXISTS pulse_eval_subject_check;
ALTER TABLE pulse_evaluations ADD CONSTRAINT pulse_eval_subject_check CHECK (
  (user_id IS NOT NULL AND operational_team_member_id IS NULL)
  OR (user_id IS NULL AND operational_team_member_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_pulse_eval_otm_status
  ON pulse_evaluations (company_id, operational_team_member_id, status)
  WHERE operational_team_member_id IS NOT NULL;
