-- ============================================================================
-- IMPETUS — Rastreabilidade unificada de interações com IA (governança / auditoria)
-- Tabela: ai_interaction_traces
-- Execute no PostgreSQL após revisão (ex.: psql -f ... ou processo de migração interno).
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_interaction_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id UUID NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module_name VARCHAR(128) NOT NULL,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  system_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ai_interaction_traces_trace UNIQUE (trace_id)
);

COMMENT ON TABLE ai_interaction_traces IS
  'Registo append-only de interações IA: prompt/contexto resumido, saída, modelo e metadados para auditoria.';

COMMENT ON COLUMN ai_interaction_traces.trace_id IS
  'UUID de correlação (exposto em X-AI-Trace-ID); único globalmente.';

COMMENT ON COLUMN ai_interaction_traces.input_payload IS
  'JSON: pedido do utilizador, resumo de dados de contexto (KPIs, IDs, intervalos), sem segredos.';

COMMENT ON COLUMN ai_interaction_traces.output_response IS
  'JSON: resposta/síntese da IA ou referência estruturada à mesma.';

COMMENT ON COLUMN ai_interaction_traces.model_info IS
  'JSON: fornecedor, nome/versão do modelo, temperatura, tokens quando disponíveis.';

COMMENT ON COLUMN ai_interaction_traces.system_fingerprint IS
  'Opcional: identificador de sistema/modelo do fornecedor quando existir.';

CREATE INDEX IF NOT EXISTS idx_ai_interaction_traces_company_created
  ON ai_interaction_traces (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_interaction_traces_user_created
  ON ai_interaction_traces (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_interaction_traces_module
  ON ai_interaction_traces (company_id, module_name, created_at DESC);
