-- ============================================================================
-- IMPETUS — Conselho Cognitivo (decisões multi-IA auditáveis)
-- Tabelas: ai_decision_logs, cognitive_hitl_feedback
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_decision_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL UNIQUE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  pipeline_version VARCHAR(48) NOT NULL DEFAULT 'cognitive_council_v1',
  module VARCHAR(96),
  intent VARCHAR(96),
  risk_level VARCHAR(32),
  models_used TEXT[],
  dossier_summary JSONB,
  stages_detail JSONB,
  final_output JSONB,
  explanation_layer JSONB,
  confidence NUMERIC(7, 5),
  requires_human_validation BOOLEAN DEFAULT true,
  requires_cross_validation BOOLEAN DEFAULT false,
  degraded_mode BOOLEAN DEFAULT false,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_decision_logs_company ON ai_decision_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_decision_logs_created ON ai_decision_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS cognitive_hitl_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL REFERENCES ai_decision_logs(trace_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(24) NOT NULL,
  comment TEXT,
  adjusted_answer TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cognitive_hitl_trace ON cognitive_hitl_feedback(trace_id);
CREATE INDEX IF NOT EXISTS idx_cognitive_hitl_user ON cognitive_hitl_feedback(user_id);
