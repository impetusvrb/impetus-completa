-- Admin portal — dispositivos e IPs autorizados (equipa IMPETUS)

CREATE TABLE IF NOT EXISTS admin_trusted_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  ip_pattern TEXT NOT NULL,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'revoked')),
  approved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_trusted_ips_user ON admin_trusted_ips (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_trusted_ips_status ON admin_trusted_ips (status);

CREATE TABLE IF NOT EXISTS admin_trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  device_fingerprint_hash TEXT NOT NULL,
  device_id TEXT,
  device_label TEXT,
  user_agent TEXT,
  last_ip TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revoked')),
  approved_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ,
  UNIQUE (admin_user_id, device_fingerprint_hash)
);

CREATE INDEX IF NOT EXISTS idx_admin_trusted_devices_user ON admin_trusted_devices (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_trusted_devices_status ON admin_trusted_devices (status);
