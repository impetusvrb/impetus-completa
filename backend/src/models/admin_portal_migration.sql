-- ============================================================================
-- IMPETUS ADMIN PORTAL — usuários internos, logs, colunas comerciais em companies
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK (perfil IN ('super_admin', 'admin_comercial', 'admin_suporte')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users (lower(email));

CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  entidade TEXT,
  entidade_id TEXT,
  detalhes JSONB,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs (admin_user_id);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS razao_social TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nome_fantasia TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS email_responsavel TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS telefone_responsavel TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS nome_responsavel TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS quantidade_usuarios_contratados INTEGER;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tenant_status TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS observacoes_comercial TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cor_tema TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS created_by_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL;

UPDATE companies SET tenant_status = CASE WHEN active IS true THEN 'ativo' ELSE 'suspenso' END
WHERE tenant_status IS NULL;

UPDATE companies SET tenant_status = 'ativo' WHERE tenant_status IS NOT NULL AND tenant_status NOT IN ('teste', 'ativo', 'suspenso', 'cancelado');

UPDATE companies SET razao_social = COALESCE(razao_social, name) WHERE razao_social IS NULL AND name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_slug_unique ON companies (slug) WHERE slug IS NOT NULL AND length(trim(slug)) > 0;
