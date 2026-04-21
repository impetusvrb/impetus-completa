-- Validação organizacional hierárquica por área (departamento)
-- Executar: psql $DATABASE_URL -f organizational_validation_hierarchy_migration.sql

ALTER TABLE role_verification_requests
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id) ON DELETE SET NULL;

ALTER TABLE role_verification_requests
  ADD COLUMN IF NOT EXISTS request_type VARCHAR(32) NOT NULL DEFAULT 'initial';

ALTER TABLE role_verification_requests
  ADD COLUMN IF NOT EXISTS subject_snapshot JSONB;

ALTER TABLE role_verification_requests
  ADD COLUMN IF NOT EXISTS change_diff JSONB;

ALTER TABLE role_verification_requests
  ADD COLUMN IF NOT EXISTS structure_error TEXT;

ALTER TABLE role_verification_requests
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

COMMENT ON COLUMN role_verification_requests.request_type IS 'initial | revalidation';
COMMENT ON COLUMN role_verification_requests.subject_snapshot IS 'Snapshot dos dados organizacionais no pedido';
COMMENT ON COLUMN role_verification_requests.change_diff IS 'Diff { field, old, new } para revalidação';

CREATE INDEX IF NOT EXISTS idx_role_verif_department ON role_verification_requests (department_id);
CREATE INDEX IF NOT EXISTS idx_role_verif_request_type ON role_verification_requests (request_type);

CREATE TABLE IF NOT EXISTS organizational_validation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subject_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  request_id UUID REFERENCES role_verification_requests(id) ON DELETE SET NULL,
  action VARCHAR(64) NOT NULL,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orgvalhist_company ON organizational_validation_history (company_id);
CREATE INDEX IF NOT EXISTS idx_orgvalhist_subject ON organizational_validation_history (subject_user_id);
CREATE INDEX IF NOT EXISTS idx_orgvalhist_created ON organizational_validation_history (created_at DESC);
