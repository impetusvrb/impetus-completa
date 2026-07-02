-- CERT-PULSE-03 — Auditoria rastreável + trace do Pulse Cognitivo (aditivo)

CREATE TABLE IF NOT EXISTS pulse_cognitive_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  trace_id TEXT NOT NULL,
  event_type TEXT,
  event_source TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  indices_recalculated JSONB NOT NULL DEFAULT '[]',
  ai_participated BOOLEAN NOT NULL DEFAULT false,
  processing_ms INT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pc_audit_company_created
  ON pulse_cognitive_audit_log(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pc_audit_trace ON pulse_cognitive_audit_log(trace_id);

COMMENT ON TABLE pulse_cognitive_audit_log IS 'CERT-PULSE-03: auditoria HITL do Pulse Cognitivo (trace-id, índices, IA).';
