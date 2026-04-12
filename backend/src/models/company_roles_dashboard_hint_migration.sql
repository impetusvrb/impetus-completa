-- Metadado opcional na base estrutural: área funcional para o motor de dashboard (sem alterar role/RBAC).
-- Valores esperados alinhados a users.functional_area (production, hr, maintenance, ...).
ALTER TABLE company_roles
  ADD COLUMN IF NOT EXISTS dashboard_functional_hint VARCHAR(32);

COMMENT ON COLUMN company_roles.dashboard_functional_hint IS
  'Opcional: área funcional para resolução de dashboard (ex.: hr, maintenance). Não substitui users.functional_area quando este está preenchido.';
