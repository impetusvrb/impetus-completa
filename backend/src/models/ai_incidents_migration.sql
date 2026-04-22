-- ============================================================================
-- IMPETUS — Gestão de incidentes de qualidade da IA (reporte conversacional)
-- Tabela: ai_incidents — vínculo obrigatório com ai_interaction_traces.trace_id
-- Execute no PostgreSQL após revisão.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  incident_type VARCHAR(32) NOT NULL
    CHECK (incident_type IN ('ALUCINACAO', 'DADO_INCORRETO', 'VIES', 'COMPORTAMENTO_INADEQUADO', 'UNKNOWN')),
  user_comment TEXT,
  status VARCHAR(24) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'UNDER_ANALYSIS', 'RESOLVED', 'FALSE_POSITIVE')),
  severity VARCHAR(16) NOT NULL DEFAULT 'MEDIUM'
    CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by_admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_by_impetus_admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_ai_incidents_trace FOREIGN KEY (trace_id)
    REFERENCES ai_interaction_traces(trace_id) ON DELETE RESTRICT
);

COMMENT ON TABLE ai_incidents IS
  'Incidentes reportados por utilizadores (alucinação, dados incorretos, etc.), ligados à caixa-preta (trace).';

COMMENT ON COLUMN ai_incidents.trace_id IS
  'UUID da interação IA em ai_interaction_traces; obrigatório para auditoria e linhagem.';

CREATE INDEX IF NOT EXISTS idx_ai_incidents_company_created
  ON ai_incidents (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_incidents_company_status
  ON ai_incidents (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_incidents_trace
  ON ai_incidents (trace_id);

CREATE INDEX IF NOT EXISTS idx_ai_incidents_user
  ON ai_incidents (user_id, created_at DESC);
