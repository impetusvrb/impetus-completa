-- IMPETUS Fase 2 — Support Recovery Governance (auditoria enterprise)
-- Aditiva. Executar após tenant_admins existir.

CREATE TABLE IF NOT EXISTS support_recovery_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_second_approval'
    CHECK (status IN (
      'pending_second_approval',
      'approved',
      'executed',
      'denied',
      'expired',
      'cancelled'
    )),
  recovery_reason TEXT NOT NULL,
  recovery_type TEXT NOT NULL DEFAULT 'inject_recovery_admin'
    CHECK (recovery_type IN ('inject_recovery_admin', 'promote_primary')),
  ticket_reference TEXT NOT NULL,
  ownership_notes TEXT,
  requested_by_admin_id UUID NOT NULL REFERENCES admin_users(id),
  approved_by_admin_id UUID REFERENCES admin_users(id),
  denied_by_admin_id UUID REFERENCES admin_users(id),
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  previous_tenant_admins_snapshot JSONB,
  session_invalidation_user_ids UUID[] DEFAULT '{}',
  created_admin_snapshot JSONB,
  execute_deadline TIMESTAMPTZ,
  forced_non_orphan BOOLEAN NOT NULL DEFAULT false,
  request_ip TEXT,
  approve_ip TEXT,
  execute_ip TEXT,
  deny_ip TEXT,
  user_agent_request TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  denied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_support_recovery_ops_company
  ON support_recovery_operations (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_recovery_ops_status
  ON support_recovery_operations (status, execute_deadline);

COMMENT ON TABLE support_recovery_operations IS 'Operações de recuperação de governança tenant pela equipa Impetus (Fase 2).';

-- Append-only: eventos por operação
CREATE TABLE IF NOT EXISTS support_recovery_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES support_recovery_operations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_recovery_audit_op
  ON support_recovery_audit_events (operation_id, created_at ASC);

COMMENT ON TABLE support_recovery_audit_events IS 'Trail append-only por operação de support recovery.';
