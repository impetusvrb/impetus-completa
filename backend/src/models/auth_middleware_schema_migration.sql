/* Colunas exigidas por validateSession / validateJWT paths em src/middleware/auth.js.
   Idempotente (IF NOT EXISTS). Executar em todos os ambientes para evitar schema drift e 401 em sessões válidas. */

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS factory_member_confirmed_at TIMESTAMPTZ;

ALTER TABLE company_roles ADD COLUMN IF NOT EXISTS dashboard_functional_hint VARCHAR(32);
