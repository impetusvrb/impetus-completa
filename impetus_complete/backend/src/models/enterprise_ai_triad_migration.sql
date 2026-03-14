-- ============================================================================
-- IMPETUS - TRÍADE DE IAs - enterprise_ai_memory, industry_intelligence, company_operation
-- Claude (análise) + Gemini (multimodal) + ChatGPT (conversação)
-- ============================================================================

-- 1. ENTERPRISE_AI_MEMORY - Insights, eventos e alertas das 3 IAs
CREATE TABLE IF NOT EXISTS enterprise_ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  source_ai TEXT NOT NULL CHECK (source_ai IN ('claude', 'gemini', 'chatgpt')),
  tipo TEXT NOT NULL CHECK (tipo IN ('insight', 'evento', 'alerta', 'padrao', 'analise')),
  conteudo TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  equipamento TEXT,
  linha TEXT,
  nivel_risco TEXT CHECK (nivel_risco IN ('baixo', 'medio', 'alto', 'critico')),
  confiabilidade NUMERIC(5,2),

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_ai_memory_company ON enterprise_ai_memory(company_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_ai_memory_source ON enterprise_ai_memory(company_id, source_ai);
CREATE INDEX IF NOT EXISTS idx_enterprise_ai_memory_tipo ON enterprise_ai_memory(company_id, tipo);
CREATE INDEX IF NOT EXISTS idx_enterprise_ai_memory_created ON enterprise_ai_memory(company_id, created_at DESC);

-- 2. INDUSTRY_INTELLIGENCE_MEMORY - Padrões operacionais e aprendizado
CREATE TABLE IF NOT EXISTS industry_intelligence_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  tipo_registro TEXT NOT NULL CHECK (tipo_registro IN (
    'padrao_operacional', 'padrao_falha', 'comportamento_normal', 'comportamento_anormal',
    'evento_historico', 'solucao_aplicada', 'melhoria_sugerida'
  )),
  descricao TEXT NOT NULL,
  equipamento TEXT,
  linha TEXT,
  causa_identificada TEXT,
  solucao_aplicada TEXT,
  resultado TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_industry_intel_company ON industry_intelligence_memory(company_id);
CREATE INDEX IF NOT EXISTS idx_industry_intel_tipo ON industry_intelligence_memory(company_id, tipo_registro);

-- 3. COMPANY_OPERATION_MEMORY - Cadastrar com IA (módulo de cadastro multimodal)
CREATE TABLE IF NOT EXISTS company_operation_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  categoria TEXT NOT NULL CHECK (categoria IN (
    'equipamento', 'custo', 'processo', 'material', 'fornecedor', 'documentacao', 'rotina', 'outro'
  )),
  conteudo_original TEXT,
  dados_extraidos JSONB NOT NULL DEFAULT '{}',
  resumo TEXT,

  source_type TEXT CHECK (source_type IN ('texto', 'imagem', 'documento', 'audio', 'video')),
  file_path TEXT,
  sector TEXT,
  equipamento TEXT,
  processo_relacionado TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_op_memory_company ON company_operation_memory(company_id);
CREATE INDEX IF NOT EXISTS idx_company_op_memory_categoria ON company_operation_memory(company_id, categoria);
CREATE INDEX IF NOT EXISTS idx_company_op_memory_created ON company_operation_memory(company_id, created_at DESC);

-- 4. AI_KNOWLEDGE_EXCHANGE - Troca de descobertas entre IAs
CREATE TABLE IF NOT EXISTS ai_knowledge_exchange (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_ai TEXT NOT NULL CHECK (from_ai IN ('claude', 'gemini', 'chatgpt')),
  to_ai TEXT NOT NULL CHECK (to_ai IN ('claude', 'gemini', 'chatgpt')),
  exchange_type TEXT CHECK (exchange_type IN ('insight', 'padrao', 'evento', 'recomendacao')),
  payload JSONB NOT NULL DEFAULT '{}',
  consumed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_company ON ai_knowledge_exchange(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_to_consumed ON ai_knowledge_exchange(to_ai, consumed);
