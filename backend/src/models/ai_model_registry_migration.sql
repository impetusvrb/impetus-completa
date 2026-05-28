-- AI Model Registry + Prompt Lineage (PROMPT 12) — additive-only
-- Run idempotently on deploy / boot ensure

CREATE TABLE IF NOT EXISTS ai_model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key VARCHAR(128) NOT NULL,
  provider VARCHAR(64) NOT NULL,
  model_id VARCHAR(128) NOT NULL,
  version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  display_name VARCHAR(256),
  risk_classification VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
  governance_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_card JSONB NOT NULL DEFAULT '{}'::jsonb,
  iso_42001_controls JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_model_registry_model_key_unique UNIQUE (model_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_model_registry_provider ON ai_model_registry(provider, active);
CREATE INDEX IF NOT EXISTS idx_ai_model_registry_risk ON ai_model_registry(risk_classification);

CREATE TABLE IF NOT EXISTS ai_prompt_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL,
  company_id UUID NOT NULL,
  user_id UUID,
  module_name VARCHAR(128),
  prompt_hash VARCHAR(64),
  prompt_version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
  parent_trace_id UUID,
  model_key VARCHAR(128),
  model_version VARCHAR(32),
  provider_lineage JSONB NOT NULL DEFAULT '{}'::jsonb,
  temperature_lineage JSONB NOT NULL DEFAULT '{}'::jsonb,
  context_lineage JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  explainability_ref JSONB NOT NULL DEFAULT '{}'::jsonb,
  runtime_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  governance_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  chat_message_id UUID,
  legal_audit_log_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_prompt_lineage_trace ON ai_prompt_lineage(trace_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_lineage_company_created ON ai_prompt_lineage(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_lineage_model ON ai_prompt_lineage(model_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_prompt_lineage_trace_unique ON ai_prompt_lineage(trace_id);

ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS ai_governance_metadata JSONB;
