-- PROMPT 24 — Action Runtime + HITL (approval queue + execution traces)
-- Aditivo, idempotente.

CREATE TABLE IF NOT EXISTS ai_action_approval_queue (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  requested_by_user_id UUID NULL,
  conversation_id UUID NULL,
  trace_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'MEDIUM',
  tool_args JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  explainability JSONB NOT NULL DEFAULT '{}'::jsonb,
  approval_required BOOLEAN NOT NULL DEFAULT true,
  approved_by_user_id UUID NULL,
  approved_at TIMESTAMPTZ NULL,
  rejected_by_user_id UUID NULL,
  rejected_at TIMESTAMPTZ NULL,
  rejection_reason TEXT NULL,
  execution_trace_id UUID NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_action_approval_company_status
  ON ai_action_approval_queue (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_action_approval_trace
  ON ai_action_approval_queue (trace_id);

CREATE TABLE IF NOT EXISTS ai_action_execution_traces (
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL,
  approval_id UUID NULL REFERENCES ai_action_approval_queue(id) ON DELETE SET NULL,
  trace_id TEXT NOT NULL,
  tool_name TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  requested_by_user_id UUID NULL,
  executed_by_user_id UUID NULL,
  tool_args JSONB NOT NULL DEFAULT '{}'::jsonb,
  execution_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  explainability JSONB NOT NULL DEFAULT '{}'::jsonb,
  rollback_available BOOLEAN NOT NULL DEFAULT false,
  rolled_back_at TIMESTAMPTZ NULL,
  rollback_result JSONB NULL,
  error_message TEXT NULL,
  duration_ms INT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_action_trace_company_created
  ON ai_action_execution_traces (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_action_trace_status
  ON ai_action_execution_traces (status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_action_trace_trace_id
  ON ai_action_execution_traces (trace_id);
