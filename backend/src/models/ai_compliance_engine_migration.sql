-- ============================================================================
-- IMPETUS — AI Compliance Engine (LGPD / trilha legal / classificação de dados)
-- Executar no PostgreSQL após revisão.
-- ============================================================================

-- Base legal (art. 7º LGPD) + operação industrial; valores validados na aplicação.
ALTER TABLE ai_interaction_traces
  ADD COLUMN IF NOT EXISTS legal_basis VARCHAR(48),
  ADD COLUMN IF NOT EXISTS data_classification JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN ai_interaction_traces.legal_basis IS
  'Base legal do tratamento: LEGITIMATE_INTEREST | CONTRACT | CONSENT | LEGAL_OBLIGATION | INDUSTRIAL_OPERATION';
COMMENT ON COLUMN ai_interaction_traces.data_classification IS
  'Resultado imutável da classificação (PII/sensível/campos detetados) no momento do trace.';

CREATE TABLE IF NOT EXISTS ai_legal_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(24) NOT NULL
    CHECK (action_type IN ('ACCESS', 'PROCESS', 'BLOCK', 'ANONYMIZE')),
  data_classification JSONB NOT NULL DEFAULT '{}'::jsonb,
  legal_basis VARCHAR(48),
  risk_level VARCHAR(16),
  decision_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_legal_audit_logs IS
  'Trilha legal append-only: decisões de conformidade por trace (sem UPDATE/DELETE pela aplicação).';

CREATE INDEX IF NOT EXISTS idx_ai_legal_audit_company_created
  ON ai_legal_audit_logs (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_legal_audit_trace
  ON ai_legal_audit_logs (trace_id);
CREATE INDEX IF NOT EXISTS idx_ai_legal_audit_action
  ON ai_legal_audit_logs (company_id, action_type, created_at DESC);

-- COMPLIANCE_RISK e TENTATIVA_DE_INVASAO (já usados no serviço Node).
ALTER TABLE ai_incidents DROP CONSTRAINT IF EXISTS ai_incidents_incident_type_check;
ALTER TABLE ai_incidents ADD CONSTRAINT ai_incidents_incident_type_check CHECK (
  incident_type IN (
    'ALUCINACAO',
    'DADO_INCORRETO',
    'VIES',
    'COMPORTAMENTO_INADEQUADO',
    'UNKNOWN',
    'TENTATIVA_DE_INVASAO',
    'COMPLIANCE_RISK'
  )
);
