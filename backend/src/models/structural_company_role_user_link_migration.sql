-- Liga utilizadores ao cargo formal da Base Estrutural (company_roles).
-- Executar uma vez no PostgreSQL, ex.: psql $DATABASE_URL -f structural_company_role_user_link_migration.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS company_role_id UUID;

-- FK sem garantir mesmo company_id em SQL puro; validação na aplicação.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_company_role_id_fkey'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_company_role_id_fkey
      FOREIGN KEY (company_role_id) REFERENCES company_roles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_company_role_id ON users(company_role_id) WHERE company_role_id IS NOT NULL;
