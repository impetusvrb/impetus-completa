-- CERT-EVENT-RETENTION-01 — Lifecycle, políticas configuráveis e auditoria do Event Backbone
-- Aditivo, idempotente. Não remove dados nem altera contratos existentes.

-- ─── Políticas de retenção por categoria (configurável) ─────────────────────
CREATE TABLE IF NOT EXISTS event_backbone_retention_policy (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  display_name TEXT NOT NULL,
  active_days INT NOT NULL DEFAULT 90,
  archive_days INT NOT NULL DEFAULT 365,
  historical_days INT NULL,
  purge_allowed BOOLEAN NOT NULL DEFAULT false,
  compress_on_archive BOOLEAN NOT NULL DEFAULT true,
  lgpd_anonymize_before_archive BOOLEAN NOT NULL DEFAULT false,
  legal_basis TEXT NULL,
  notes TEXT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Auditoria imutável de transições de lifecycle ─────────────────────────
CREATE TABLE IF NOT EXISTS event_backbone_lifecycle_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL,
  event_ref_id UUID NULL,
  source_table TEXT NOT NULL,
  event_name TEXT NULL,
  domain TEXT NULL,
  company_id UUID NULL,
  category TEXT NULL,
  from_state TEXT NULL,
  to_state TEXT NOT NULL,
  policy_id TEXT NULL,
  policy_version TEXT NULL DEFAULT '1.0.0',
  reason TEXT NOT NULL,
  scheduler_run_id UUID NULL,
  actor_type TEXT NOT NULL DEFAULT 'scheduler',
  actor_id TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eb_lifecycle_audit_company_created
  ON event_backbone_lifecycle_audit (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eb_lifecycle_audit_trace
  ON event_backbone_lifecycle_audit (trace_id);

CREATE INDEX IF NOT EXISTS idx_eb_lifecycle_audit_event_ref
  ON event_backbone_lifecycle_audit (event_ref_id, created_at DESC);

-- ─── Extensões aditivas em industrial_event_archive ────────────────────────
ALTER TABLE industrial_event_archive
  ADD COLUMN IF NOT EXISTS lifecycle_state TEXT NOT NULL DEFAULT 'ARCHIVED';

ALTER TABLE industrial_event_archive
  ADD COLUMN IF NOT EXISTS event_category TEXT NULL;

ALTER TABLE industrial_event_archive
  ADD COLUMN IF NOT EXISTS consolidated_at TIMESTAMPTZ NULL;

ALTER TABLE industrial_event_archive
  ADD COLUMN IF NOT EXISTS historical_at TIMESTAMPTZ NULL;

ALTER TABLE industrial_event_archive
  ADD COLUMN IF NOT EXISTS purge_eligible_at TIMESTAMPTZ NULL;

ALTER TABLE industrial_event_archive
  ADD COLUMN IF NOT EXISTS compressed_payload BYTEA NULL;

ALTER TABLE industrial_event_archive
  ADD COLUMN IF NOT EXISTS integrity_checksum TEXT NULL;

ALTER TABLE industrial_event_archive
  ADD COLUMN IF NOT EXISTS explainability JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_industrial_archive_lifecycle_state
  ON industrial_event_archive (lifecycle_state, company_id, archived_at DESC);

CREATE INDEX IF NOT EXISTS idx_industrial_archive_category_historical
  ON industrial_event_archive (event_category, lifecycle_state, archived_at DESC)
  WHERE lifecycle_state IN ('ARCHIVED', 'HISTORICAL');

-- ─── Extensões aditivas em industrial_event_outbox (estado ACTIVE visível) ─
ALTER TABLE industrial_event_outbox
  ADD COLUMN IF NOT EXISTS lifecycle_state TEXT NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE industrial_event_outbox
  ADD COLUMN IF NOT EXISTS event_category TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_industrial_outbox_lifecycle_active
  ON industrial_event_outbox (lifecycle_state, company_id, created_at DESC)
  WHERE lifecycle_state = 'ACTIVE';

-- ─── Seeds de política (idempotente) ─────────────────────────────────────────
INSERT INTO event_backbone_retention_policy (
  id, category, display_name, active_days, archive_days, historical_days,
  purge_allowed, compress_on_archive, lgpd_anonymize_before_archive, legal_basis, notes
) VALUES
  ('policy_operational_telemetry', 'operational_telemetry', 'Telemetria / PLC / Sensores', 90, 365, 1825, false, true, false, 'Art. 7°, IX LGPD — Interesse legítimo', 'Hot 90d → archive 1y → histórico agregado'),
  ('policy_operational_industrial', 'operational_industrial', 'Eventos Industriais / MES / ERP', 365, 1825, NULL, false, true, false, 'Art. 7°, IX LGPD — Interesse legítimo', 'Consolidação antes de arquivar'),
  ('policy_human_pulse', 'human_pulse', 'Pulse / RH / Pró-Ação', 365, 1825, NULL, false, true, true, 'Art. 7°, I LGPD — Consentimento', 'Anonimização LGPD quando aplicável'),
  ('policy_cognitive', 'cognitive', 'Controller / ANAM / Insights', 180, 730, 1825, false, true, false, 'Art. 37 LGPD — Registro de operações', 'Explainability preservada'),
  ('policy_audit_compliance', 'audit_compliance', 'Auditoria / Governança / LGPD', 0, 0, NULL, false, false, false, 'Art. 37 LGPD — Registro de operações', 'Nunca expurgar — apenas arquivar'),
  ('policy_workflow_outbox', 'workflow_outbox', 'Outbox / DLQ / Workflow', 14, 365, 1825, false, true, false, 'Art. 7°, IX LGPD — Interesse legítimo', 'Alinhado ao industrial_event_outbox registry')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  active_days = EXCLUDED.active_days,
  archive_days = EXCLUDED.archive_days,
  historical_days = EXCLUDED.historical_days,
  purge_allowed = EXCLUDED.purge_allowed,
  compress_on_archive = EXCLUDED.compress_on_archive,
  lgpd_anonymize_before_archive = EXCLUDED.lgpd_anonymize_before_archive,
  legal_basis = EXCLUDED.legal_basis,
  notes = EXCLUDED.notes,
  updated_at = now();
