-- PROMPT 16 — Enterprise Federation (OIDC · SAML · SCIM)
-- additive-only · tenant-scoped · pilot rollout

CREATE TABLE IF NOT EXISTS tenant_federation_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_type TEXT NOT NULL CHECK (provider_type IN ('oidc', 'saml')),
  enabled BOOLEAN NOT NULL DEFAULT false,
  display_name TEXT NOT NULL DEFAULT 'IdP Enterprise',
  mode TEXT NOT NULL DEFAULT 'shadow' CHECK (mode IN ('shadow', 'audit', 'on')),
  issuer_url TEXT,
  client_id TEXT,
  client_secret_env_key TEXT,
  scopes TEXT DEFAULT 'openid profile email',
  redirect_uri_override TEXT,
  idp_entity_id TEXT,
  idp_sso_url TEXT,
  idp_certificate_pem TEXT,
  sp_entity_id TEXT,
  acs_url_override TEXT,
  attribute_mapping JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_fed_provider_company
  ON tenant_federation_providers (company_id, provider_type, enabled);

CREATE TABLE IF NOT EXISTS federation_identity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES tenant_federation_providers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_subject TEXT NOT NULL,
  external_email TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider_id, external_subject)
);

CREATE INDEX IF NOT EXISTS idx_fed_identity_user
  ON federation_identity_links (user_id, company_id);

CREATE TABLE IF NOT EXISTS federation_auth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_token TEXT NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES tenant_federation_providers(id) ON DELETE CASCADE,
  protocol TEXT NOT NULL CHECK (protocol IN ('oidc', 'saml')),
  nonce TEXT,
  code_verifier TEXT,
  relay_state TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fed_auth_state_expires
  ON federation_auth_states (expires_at);

CREATE TABLE IF NOT EXISTS federation_login_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES tenant_federation_providers(id) ON DELETE SET NULL,
  protocol TEXT,
  event TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'pending',
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fed_login_trace_company
  ON federation_login_traces (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fed_login_trace_trace
  ON federation_login_traces (trace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS scim_provisioning_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT 'SCIM provisioning',
  scopes TEXT[] NOT NULL DEFAULT ARRAY['Users'],
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scim_token_company
  ON scim_provisioning_tokens (company_id) WHERE active = true;

CREATE TABLE IF NOT EXISTS scim_provisioning_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'User',
  external_id TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scim_audit_company
  ON scim_provisioning_audit (company_id, created_at DESC);
