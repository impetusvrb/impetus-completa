-- Hallucination Detection V1 (PROMPT 13) — additive-only

CREATE TABLE IF NOT EXISTS ai_hallucination_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL,
  company_id UUID NOT NULL,
  user_id UUID,
  module_name VARCHAR(128),
  confidence_score NUMERIC(6,4),
  grounding_score NUMERIC(6,4),
  contradiction_score NUMERIC(6,4),
  semantic_valid BOOLEAN,
  sz5_cross_check_passed BOOLEAN,
  low_confidence_flag BOOLEAN DEFAULT false,
  requires_human_review BOOLEAN DEFAULT false,
  severity VARCHAR(16) DEFAULT 'INFO',
  indicators JSONB NOT NULL DEFAULT '[]'::jsonb,
  governance_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  explainability JSONB NOT NULL DEFAULT '{}'::jsonb,
  false_positive_marked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_hallucination_assessments_trace
  ON ai_hallucination_assessments(trace_id);

CREATE INDEX IF NOT EXISTS idx_ai_hallucination_assessments_company_created
  ON ai_hallucination_assessments(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_hallucination_assessments_review_queue
  ON ai_hallucination_assessments(company_id, requires_human_review)
  WHERE requires_human_review = true AND false_positive_marked = false;
