-- CERT-PULSE-05 — Memória Organizacional Cognitiva (consultiva; não altera índices)

CREATE TABLE IF NOT EXISTS pulse_organizational_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL DEFAULT 'company',
  scope_key TEXT NOT NULL DEFAULT 'all',
  scope_label TEXT,
  case_fingerprint TEXT NOT NULL,
  signal_signature JSONB NOT NULL DEFAULT '{}',
  pattern_codes JSONB NOT NULL DEFAULT '[]',
  pulse_index_before NUMERIC(5,2),
  pulse_index_after NUMERIC(5,2),
  organizational_state TEXT,
  human_actions JSONB NOT NULL DEFAULT '[]',
  outcome JSONB NOT NULL DEFAULT '{}',
  outcome_delta_percent NUMERIC(6,2),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  source TEXT NOT NULL DEFAULT 'cognitive_snapshot',
  human_validated BOOLEAN NOT NULL DEFAULT false,
  assistive_only BOOLEAN NOT NULL DEFAULT true,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pom_company_recorded
  ON pulse_organizational_memory(company_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_pom_company_fingerprint
  ON pulse_organizational_memory(company_id, case_fingerprint);
CREATE INDEX IF NOT EXISTS idx_pom_scope
  ON pulse_organizational_memory(company_id, scope_type, scope_key);

COMMENT ON TABLE pulse_organizational_memory IS
  'CERT-PULSE-05: memória organizacional consultiva (histórico semelhante; não altera Pulse Index).';
