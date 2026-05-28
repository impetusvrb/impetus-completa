-- PROMPT 17 — Enterprise MFA Universal (TOTP · WebAuthn · Backup · Device Trust)

CREATE TABLE IF NOT EXISTS tenant_mfa_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  mode TEXT NOT NULL DEFAULT 'shadow' CHECK (mode IN ('shadow', 'audit', 'on')),
  enforcement_level TEXT NOT NULL DEFAULT 'recommended'
    CHECK (enforcement_level IN ('optional', 'recommended', 'required_admin', 'required_all')),
  require_totp BOOLEAN NOT NULL DEFAULT true,
  allow_webauthn BOOLEAN NOT NULL DEFAULT true,
  allow_backup_codes BOOLEAN NOT NULL DEFAULT true,
  device_trust_days INTEGER NOT NULL DEFAULT 14,
  grace_period_days INTEGER NOT NULL DEFAULT 14,
  min_hierarchy_level INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

CREATE TABLE IF NOT EXISTS user_mfa_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  totp_enabled BOOLEAN NOT NULL DEFAULT false,
  totp_secret_encrypted TEXT,
  webauthn_enabled BOOLEAN NOT NULL DEFAULT false,
  enrolled_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS user_mfa_webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL,
  public_key BYTEA NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_name TEXT,
  transports TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  UNIQUE (credential_id)
);

CREATE INDEX IF NOT EXISTS idx_mfa_webauthn_user
  ON user_mfa_webauthn_credentials (user_id, company_id);

CREATE TABLE IF NOT EXISTS user_mfa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_backup_user
  ON user_mfa_backup_codes (user_id) WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS user_mfa_trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  device_fingerprint_hash TEXT NOT NULL,
  device_label TEXT,
  trust_until TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_fingerprint_hash)
);

CREATE TABLE IF NOT EXISTS mfa_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_token_hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  methods_allowed TEXT[] NOT NULL DEFAULT ARRAY['totp','webauthn','backup'],
  ip_address INET,
  user_agent TEXT,
  device_fingerprint_hash TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_challenges_user
  ON mfa_challenges (user_id, expires_at DESC);

CREATE TABLE IF NOT EXISTS mfa_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'ok',
  method TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mfa_audit_company
  ON mfa_audit_events (company_id, created_at DESC);
