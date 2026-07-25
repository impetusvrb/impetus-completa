-- Admin portal equipe — TOTP 2FA (camada software, contas admin_users)
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_secret_encrypted TEXT;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS totp_enrolled_at TIMESTAMPTZ;
