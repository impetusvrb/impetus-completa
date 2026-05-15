-- IMPETUS — Governança administrativa redundante por tenant (Fase 1)
-- Aditiva, idempotente (IF NOT EXISTS). Executar em janela segura.
--
-- Rollback (manual): ver tenant_admins_rollback.sql
--
CREATE TABLE IF NOT EXISTS tenant_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  admin_type TEXT NOT NULL CHECK (admin_type IN ('primary', 'secondary', 'recovery')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_by UUID REFERENCES users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_admins_company_status
  ON tenant_admins (company_id, status);

CREATE INDEX IF NOT EXISTS idx_tenant_admins_user_active
  ON tenant_admins (user_id) WHERE status = 'active';

-- No máximo um admin primário activo por empresa.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_admins_one_primary
  ON tenant_admins (company_id)
  WHERE status = 'active' AND admin_type = 'primary';

-- No máximo um recovery activo por empresa.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_admins_one_recovery
  ON tenant_admins (company_id)
  WHERE status = 'active' AND admin_type = 'recovery';

-- Um utilizador só pode ter um registo activo por empresa.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_admins_company_user_active
  ON tenant_admins (company_id, user_id)
  WHERE status = 'active';

COMMENT ON TABLE tenant_admins IS 'Camada de governança do tenant (separada de cargo organizacional / hierarchy).';

-- ─── Bootstrap: candidatos legacy role=admin ou is_company_root (sem alterar users) ───
INSERT INTO tenant_admins (company_id, user_id, admin_type, status, created_by, created_at)
SELECT p.company_id, p.id, 'primary', 'active', NULL, now()
FROM (
  SELECT DISTINCT ON (u.company_id)
    u.company_id,
    u.id
  FROM users u
  WHERE u.deleted_at IS NULL
    AND u.active = true
    AND u.company_id IS NOT NULL
    AND (
      LOWER(TRIM(COALESCE(u.role, ''))) = 'admin'
      OR COALESCE(u.is_company_root, false) = true
    )
  ORDER BY u.company_id,
    CASE WHEN LOWER(TRIM(COALESCE(u.role, ''))) = 'admin' THEN 0 ELSE 1 END,
    CASE WHEN COALESCE(u.is_company_root, false) THEN 0 ELSE 1 END,
    u.created_at ASC NULLS LAST
) p
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_admins t
  WHERE t.company_id = p.company_id
    AND t.status = 'active'
    AND t.admin_type = 'primary'
);

-- Demais candidatos → secondary (idempotente)
INSERT INTO tenant_admins (company_id, user_id, admin_type, status, created_by, created_at)
SELECT u.company_id, u.id, 'secondary', 'active', NULL, now()
FROM users u
WHERE u.deleted_at IS NULL
  AND u.active = true
  AND u.company_id IS NOT NULL
  AND (
    LOWER(TRIM(COALESCE(u.role, ''))) = 'admin'
    OR COALESCE(u.is_company_root, false) = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM tenant_admins ta
    WHERE ta.company_id = u.company_id
      AND ta.user_id = u.id
      AND ta.status = 'active'
  );
